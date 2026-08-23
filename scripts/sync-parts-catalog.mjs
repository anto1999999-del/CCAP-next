/**
 * Pull the supplier's catalogue into content/parts/.
 *
 * The site does not read the supplier's API at request time: it does not honour
 * filter parameters, and it is slow often enough that a page which depends on
 * it is a page that sometimes does not load. This script is the only thing that
 * talks to it, and it writes:
 *
 *   catalog.json       every part, with ONE image each
 *   galleries/xx.ndjson every image, keyed by part, across 256 files
 *
 * Splitting them is what keeps memory use sane. The grid needs a thumbnail per
 * part and nothing else; carrying every image in the catalogue took the old
 * backend from roughly 150MB resident to 1.2GB, on a 2GB droplet. The galleries
 * come to 290MB all together, so they are split across 256 files of about a
 * megabyte: opening a part reads the one file its part is in.
 *
 * Those files are written a line at a time as the sync runs, so this script
 * holds one page of parts at a time rather than the whole 290MB. That matters
 * because it runs on the same 2GB droplet that serves the site.
 *
 * The extra images are not discarded, because the part page cannot get them
 * back: the supplier's per-part image endpoint answered none of fourteen
 * requests when it was measured, most of them hanging past fifteen seconds.
 *
 *   node scripts/sync-parts-catalog.mjs [--pages N] [--rows N]
 *
 * --pages limits how much is fetched, for a quick sample during development.
 * Re-running replaces both files; a crash mid-run leaves the previous ones
 * intact because the write happens once, at the end, after a checkpoint.
 */

import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE_URL = process.env.PARTS_API_URL ?? "http://api.carparts-au.com";
const OUT_DIR = path.join(process.cwd(), "content", "parts");
const TIMEOUT_MS = 30_000;
const MAX_RETRIES = 6;
/** The supplier rate-limits aggressively above this. */
const DELAY_MS = Number(process.env.PARTS_SYNC_DELAY_MS ?? 150);

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  const value = Number(process.argv[index + 1]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

const ROWS = Math.min(100, arg("rows", 100));
const MAX_PAGES = arg("pages", Infinity);

function credentials() {
  const user = process.env.PARTS_API_USER;
  const password = process.env.PARTS_API_PASSWORD;
  if (!user || !password) {
    console.error(
      "PARTS_API_USER and PARTS_API_PASSWORD must be set. Put them in .env.local.",
    );
    process.exit(1);
  }
  return Buffer.from(`${user}:${password}`).toString("base64");
}

const AUTH = credentials();

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** One page, retried with a widening gap. Transient failures here are normal. */
async function fetchPage(page) {
  const url = new URL("/ops/v1/parts", BASE_URL);
  url.searchParams.set("page", String(page));
  url.searchParams.set("rows", String(ROWS));
  url.searchParams.set("imageType", "PV");

  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { accept: "application/json", authorization: `Basic ${AUTH}` },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      const backoff = Math.min(30_000, 1000 * 2 ** (attempt - 1));
      console.warn(`  page ${page} attempt ${attempt} failed (${error.message}), retrying in ${backoff / 1000}s`);
      await wait(backoff);
    }
  }
  throw new Error(`page ${page} failed after ${MAX_RETRIES} attempts: ${lastError?.message}`);
}

/** Which of the 256 gallery files a part's photographs live in. */
function shardOf(key) {
  return createHash("sha1").update(key).digest("hex").slice(0, 2);
}

function partKey(part) {
  const urgId = String(part?.urgId ?? "").trim().toLowerCase();
  const invNumber = String(part?.invNumber ?? "").trim();
  if (urgId && invNumber) return `${urgId}|${invNumber}`;
  const stockNo = String(part?.stockNo ?? "").trim();
  return stockNo ? `stock|${stockNo.toLowerCase()}` : null;
}

/** Keep the photograph of the part itself when there is one. */
function coverImage(images) {
  return images.find((image) => image?.type === "Part") ?? images[0] ?? null;
}

/** One append stream per shard, opened the first time a part lands in it. */
function shardWriter(directory) {
  const streams = new Map();
  let written = 0;

  return {
    write(key, images) {
      const shard = shardOf(key);
      let stream = streams.get(shard);
      if (!stream) {
        stream = createWriteStream(path.join(directory, `${shard}.ndjson`));
        streams.set(shard, stream);
      }
      stream.write(`${JSON.stringify({ k: key, i: images })}
`);
      written += 1;
    },
    get count() {
      return written;
    },
    get files() {
      return streams.size;
    },
    async close() {
      await Promise.all(
        [...streams.values()].map(
          (stream) => new Promise((resolve) => stream.end(resolve)),
        ),
      );
    },
  };
}

async function main() {
  console.log(`syncing from ${BASE_URL} (${ROWS} rows per page)`);

  const shardDir = path.join(OUT_DIR, "galleries");
  // Replaced wholesale, so a part that has sold does not leave its photographs
  // behind for whatever lands on its key next.
  await rm(shardDir, { recursive: true, force: true });
  await mkdir(shardDir, { recursive: true });
  const galleries = shardWriter(shardDir);

  const catalog = [];
  const seen = new Set();

  let expectedPages = null;
  let reportedTotal = null;

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const data = await fetchPage(page);
    const batch = Array.isArray(data?.results) ? data.results : [];
    if (batch.length === 0) break;

    if (reportedTotal === null && data?.totalNumResults != null) {
      reportedTotal = Number(data.totalNumResults);
    }
    if (expectedPages === null) {
      const fromApi = Number(data?.pageCount);
      expectedPages = Number.isFinite(fromApi) && fromApi > 0 ? fromApi : null;
    }

    for (const part of batch) {
      const key = partKey(part);
      if (key) {
        if (seen.has(key)) continue;
        seen.add(key);
      }

      const images = Array.isArray(part.images) ? part.images : [];
      // Only worth storing when there is more than the catalogue already keeps.
      if (key && images.length > 1) galleries.write(key, images);

      const cover = coverImage(images);
      catalog.push({ ...part, images: cover ? [cover] : [] });
    }

    if (page % 10 === 0 || page === 1) {
      console.log(
        `  page ${page}${expectedPages ? `/${expectedPages}` : ""}: ${catalog.length} parts`,
      );
    }

    if (expectedPages !== null && page >= expectedPages) break;
    if (reportedTotal !== null && catalog.length >= reportedTotal) break;
    if (DELAY_MS > 0) await wait(DELAY_MS);
  }

  await mkdir(OUT_DIR, { recursive: true });
  const syncedAt = new Date().toISOString();

  await writeFile(
    path.join(OUT_DIR, "catalog.json"),
    JSON.stringify({ syncedAt, count: catalog.length, results: catalog }),
  );
  await galleries.close();

  console.log(
    `wrote ${catalog.length} parts and ${galleries.count} galleries (${galleries.files} files) to ${OUT_DIR}`,
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

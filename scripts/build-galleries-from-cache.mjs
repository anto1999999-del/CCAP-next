/**
 * Build the app's gallery shards from the legacy gallery cache.
 *
 * The part page reads photo galleries from `<data>/galleries/<xx>.ndjson`,
 * keyed by `<urgid>|<invnumber>`, one line per part that has more than one
 * photo. On the production server that directory was never created, so every
 * part fell back to its single cover image and the yard's own photographs did
 * not show.
 *
 * The images are already on that server. The site is deployed on the box that
 * ran the previous Express API, whose `gallerycache/` holds every part's full
 * photo set -- refreshed nightly, keyed by sha1("<urgId>/<invNumber>"), stored
 * in the exact {type,img,thumb} shape this app wants. So this converts what is
 * already present rather than re-fetching 34k parts from a supplier that
 * rate-limits aggressively (which is why the app's own sync-parts-catalog.mjs
 * could not be used here).
 *
 * Paths default to that server's layout and can be overridden by env. Output is
 * built in a sibling temp directory and renamed over the live one, so a request
 * never reads a half-written gallery set. The app caches shards in memory with
 * no mtime check, so restart it after running this.
 *
 * Wired into the nightly cron after the parts refresh. See docs/LAUNCH-CHECKLIST.md.
 */
import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, readFile, rename, rm } from "node:fs/promises";
import path from "node:path";

const DATA =
  process.env.CCAP_LEGACY_DATA_DIR ?? "/root/ccautoparts/ccautoparts-api/data";
const CATALOG =
  process.env.PARTS_CATALOG_PATH ?? path.join(DATA, "partsCatalog.json");
const CACHE = path.join(DATA, "gallerycache");
const OUT = path.join(path.dirname(CATALOG), "galleries");
const TMP = `${OUT}.new`;

const shardOf = (key) =>
  createHash("sha1").update(key).digest("hex").slice(0, 2);
const cacheKeyFor = (urgId, invNumber) =>
  createHash("sha1").update(`${urgId}/${invNumber}`).digest("hex");

function shardWriter(dir) {
  const streams = new Map();
  let written = 0;
  return {
    write(key, images) {
      const shard = shardOf(key);
      let stream = streams.get(shard);
      if (!stream) {
        stream = createWriteStream(path.join(dir, `${shard}.ndjson`));
        streams.set(shard, stream);
      }
      stream.write(`${JSON.stringify({ k: key, i: images })}\n`);
      written += 1;
    },
    get written() {
      return written;
    },
    get files() {
      return streams.size;
    },
    close() {
      return Promise.all(
        [...streams.values()].map((s) => new Promise((r) => s.end(r))),
      );
    },
  };
}

async function main() {
  const parts = JSON.parse(await readFile(CATALOG, "utf8")).results ?? [];
  console.log(`catalog: ${parts.length} parts`);

  await rm(TMP, { recursive: true, force: true });
  await mkdir(TMP, { recursive: true });
  const out = shardWriter(TMP);

  let misses = 0;

  for (const part of parts) {
    const urgId = String(part.urgId ?? "").trim();
    const invNumber = String(part.invNumber ?? "").trim();
    if (!urgId || !invNumber) continue;

    const hash = cacheKeyFor(urgId, invNumber);
    let images;
    try {
      images = JSON.parse(
        await readFile(
          path.join(CACHE, hash.slice(0, 2), `${hash}.json`),
          "utf8",
        ),
      )?.images;
    } catch {
      misses += 1;
      continue;
    }

    // A lone cover already lives in the catalogue and adds nothing here.
    if (!Array.isArray(images) || images.length <= 1) continue;

    // Looked up by the lowercased key at runtime; write that, not the raw one.
    out.write(`${urgId.toLowerCase()}|${invNumber}`, images);
  }

  await out.close();
  await rm(OUT, { recursive: true, force: true });
  await rename(TMP, OUT);

  console.log(
    `galleries: ${out.written} parts across ${out.files} shards, ${misses} not in cache`,
  );
  console.log(`output: ${OUT}`);
}

main().catch((error) => {
  console.error("gallery build failed:", error);
  process.exit(1);
});

/**
 * Fetch every part's thumbnail once, so customers never wait for the supplier.
 *
 * The supplier takes between one and three seconds per image. A grid of twenty
 * parts is therefore twenty of those, and the first person to open any page
 * pays for all of them. Once an image has been through /part-image it is on
 * disk and served in about six milliseconds, so the fix is simply to be the
 * first visitor ourselves, at night, after the catalogue syncs.
 *
 * It warms through the running site rather than talking to the supplier
 * directly, so the files land exactly where the route looks for them and there
 * is only one piece of code that knows how they are stored.
 *
 *   node scripts/warm-part-images.mjs [--base http://localhost:3000] [--limit N]
 *
 * Safe to re-run and safe to interrupt: an image already on disk is served from
 * there, so a second run costs a local request and nothing upstream.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

const BASE = argValue("base") ?? "http://localhost:3000";
const LIMIT = Number(argValue("limit")) || Infinity;
/**
 * Eight at a time. The supplier is the slow part, and hammering it is how a
 * warm-up turns into an outage for the customers browsing at the same time.
 */
const CONCURRENCY = Number(argValue("concurrency")) || 8;

function argValue(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? null : process.argv[index + 1];
}

function thumbnailPath(part) {
  const images = Array.isArray(part.images) ? part.images : [];
  const cover = images.find((image) => image?.type === "Part") ?? images[0];
  const source = cover?.thumb ?? cover?.img;
  return source ? `/part-image${source}` : null;
}

async function main() {
  const catalogFile = path.join(process.cwd(), "content", "parts", "catalog.json");
  const { results } = JSON.parse(await readFile(catalogFile, "utf8"));

  const paths = results
    .map(thumbnailPath)
    .filter(Boolean)
    .slice(0, LIMIT);

  console.log(`warming ${paths.length} thumbnails through ${BASE}`);

  let done = 0;
  let hits = 0;
  let failed = 0;
  const started = Date.now();

  // A shared cursor rather than chunks: one slow image should not hold up the
  // seven workers that are free.
  let cursor = 0;
  const worker = async () => {
    while (cursor < paths.length) {
      const target = paths[cursor++];
      try {
        const response = await fetch(`${BASE}${target}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        if (response.headers.get("x-image-cache") === "HIT") hits += 1;
        // The body has to be read for the connection to be reused.
        await response.arrayBuffer();
      } catch {
        failed += 1;
      }

      done += 1;
      if (done % 500 === 0) {
        const rate = done / ((Date.now() - started) / 1000);
        const left = Math.round((paths.length - done) / rate / 60);
        console.log(
          `  ${done}/${paths.length} (${hits} already cached, ${failed} failed), about ${left} minutes left`,
        );
      }
    }
  };

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const minutes = ((Date.now() - started) / 60000).toFixed(1);
  console.log(
    `warmed ${done - failed} thumbnails in ${minutes} minutes (${hits} were already cached, ${failed} failed)`,
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

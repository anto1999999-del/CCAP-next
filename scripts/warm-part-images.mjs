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
 *   node scripts/warm-part-images.mjs [--base http://localhost:3000] [--limit N] [--full]
 *
 * --full also warms the large copy of each part's leading photograph, which is
 * the one a part page opens with. That is roughly another 11,000 images and
 * about twenty minutes, and it is what makes a part page appear finished rather
 * than filling in.
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

const WARM_FULL_SIZE = process.argv.includes("--full");

/** The images worth having on disk before anybody asks for them. */
function pathsFor(part) {
  const images = Array.isArray(part.images) ? part.images : [];
  const cover = images.find((image) => image?.type === "Part") ?? images[0];
  if (!cover) return [];

  const wanted = [cover.thumb ?? cover.img];
  if (WARM_FULL_SIZE && cover.img) wanted.push(cover.img);

  return wanted.filter(Boolean).map((source) => `/part-image${source}`);
}

async function main() {
  const catalogFile = path.join(process.cwd(), "content", "parts", "catalog.json");
  const { results } = JSON.parse(await readFile(catalogFile, "utf8"));

  /*
    Deduplicated: two thirds of the catalogue shares a photograph with another
    part, so 32,698 parts come to about 11,000 distinct images. Asking for the
    same one repeatedly would only prove the cache works.
  */
  const paths = [...new Set(results.flatMap(pathsFor))].slice(0, LIMIT);

  console.log(
    `warming ${paths.length} distinct images through ${BASE}${WARM_FULL_SIZE ? " (thumbnails and full size)" : ""}`,
  );

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
    `warmed ${done - failed} images in ${minutes} minutes (${hits} were already cached, ${failed} failed)`,
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

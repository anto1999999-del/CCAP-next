/**
 * Bring the blog's images across from WordPress.
 *
 * Every image referenced by a post is downloaded once, re-encoded as small as
 * it will go without visible loss, and written under public/blog-media/ at the
 * same path it had on WordPress. That path mapping is what lets the old image
 * URLs be redirected one-for-one, and it is why rewriteImageUrl() is a single
 * string replacement rather than a lookup table.
 *
 * Re-encoding settings are per format and deliberately conservative:
 * photographs keep quality 80 WebP, which is visually indistinguishable at the
 * sizes these are displayed; the charts are flat-colour PNGs, where a palette
 * costs nothing and saves a great deal. If a re-encode comes out larger than
 * the original, the original is kept.
 *
 * Safe to re-run: a file that is already present is left alone unless --force
 * is passed.
 *
 *   node scripts/download-blog-media.mjs [--force]
 */

import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import sharp from "sharp";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const OUT_DIR = join(ROOT, "public", "blog-media");
const POSTS = join(ROOT, "content", "blog", "posts.json");
const FORCE = process.argv.includes("--force");

/** Images are only ever displayed a little under 1000px wide. */
const MAX_WIDTH = 1600;

function referencedImages(posts) {
  const urls = new Set();
  for (const post of posts) {
    if (post.featuredImage?.url) urls.add(post.featuredImage.url);
    for (const tag of post.contentHtml.match(/<img\b[^>]*>/gi) ?? []) {
      const src = tag.match(/\ssrc="([^"]+)"/i)?.[1];
      if (src) urls.add(src);
    }
  }
  return [...urls];
}

/** The path this image will have on the new site. */
function localPath(url) {
  const { pathname } = new URL(url);
  const relative = pathname.replace(/^\/wp-content\/uploads\//, "");
  return join(OUT_DIR, relative);
}

async function compress(buffer, url) {
  const image = sharp(buffer, { animated: false });
  const meta = await image.metadata();
  const resized =
    meta.width && meta.width > MAX_WIDTH
      ? image.resize({ width: MAX_WIDTH, withoutEnlargement: true })
      : image;

  const ext = url.split(".").pop().toLowerCase();
  switch (ext) {
    case "png":
      return resized.png({ compressionLevel: 9, palette: true, effort: 10 }).toBuffer();
    case "jpg":
    case "jpeg":
      return resized.jpeg({ quality: 82, mozjpeg: true }).toBuffer();
    case "avif":
      return resized.avif({ quality: 55, effort: 6 }).toBuffer();
    default:
      return resized.webp({ quality: 80, effort: 6 }).toBuffer();
  }
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const posts = JSON.parse(await readFile(POSTS, "utf8"));
  const urls = referencedImages(posts);
  console.log(`${urls.length} images referenced by ${posts.length} posts`);

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;
  let bytesBefore = 0;
  let bytesAfter = 0;

  for (const url of urls) {
    const target = localPath(url);

    if (!FORCE && (await exists(target))) {
      skipped += 1;
      continue;
    }

    try {
      const response = await fetch(url, {
        headers: { "user-agent": "ccap-migration/1.0" },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const original = Buffer.from(await response.arrayBuffer());
      let output = original;
      try {
        const compressed = await compress(original, url);
        // Only take the re-encode when it actually wins.
        if (compressed.length < original.length) output = compressed;
      } catch (error) {
        console.warn(`  could not re-encode ${url}: ${error.message}`);
      }

      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, output);

      bytesBefore += original.length;
      bytesAfter += output.length;
      downloaded += 1;
    } catch (error) {
      failed += 1;
      console.error(`  FAILED ${url}: ${error.message}`);
    }
  }

  const mb = (bytes) => (bytes / 1024 / 1024).toFixed(2);
  console.log(`downloaded ${downloaded}, already present ${skipped}, failed ${failed}`);
  if (downloaded > 0) {
    const saved = 100 - (bytesAfter / bytesBefore) * 100;
    console.log(
      `${mb(bytesBefore)} MB downloaded, written as ${mb(bytesAfter)} MB (${saved.toFixed(1)}% smaller)`,
    );
  }
}

main();

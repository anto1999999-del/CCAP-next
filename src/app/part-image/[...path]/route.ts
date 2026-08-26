import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { NextRequest } from "next/server";

/**
 * Serve a part photograph from the supplier.
 *
 * The supplier's image host speaks plain HTTP, needs credentials, and takes
 * between one and three seconds per image, which is why these do not go
 * straight to the browser.
 *
 * Answers are cached on disk. The filenames are content-addressed UUIDs, so an
 * image that has been fetched once can be served from here forever, and a
 * product page with six photographs stops costing fifteen seconds of supplier
 * latency on every view.
 *
 * A failure answers with a real error status. An earlier version returned 200
 * with a transparent pixel "so image tags do not break"; a transparent pixel is
 * a successful load, so nothing downstream could tell a missing photo from a
 * real one, and pages showed empty frames instead of their own placeholder.
 *
 * `?w=` asks for a resized copy, because the supplier offers only two sizes and
 * neither suits a grid. Its thumbnails are 250x187 and its originals are
 * 1600x1200: a 289px card stretches the thumbnail to twice its size on any
 * retina screen, which is visibly soft, and twenty originals is five megabytes
 * of page. A resized copy is made from the original once, cached beside it, and
 * is around 30KB.
 */

const UPSTREAM = process.env.PARTS_API_URL ?? "http://api.carparts-au.com";
const TIMEOUT_MS = 15_000;

/**
 * The catalogue records image paths as /v1/image/..., but the supplier serves
 * them from /ops/v1/image/... . Asking for the path as recorded gets a 301 to
 * somewhere that does not answer, which is why every photograph was missing.
 */
const UPSTREAM_PREFIX = "/ops";

/** A month. These URLs are content-addressed, so the bytes cannot change. */
const CACHE_SECONDS = 2_592_000;

/**
 * Kept inside the project rather than in the system temp directory, which gets
 * cleaned out from under a long-running server. The overnight warm-up would be
 * thrown away with it, and every customer would be back to waiting on the
 * supplier. Point PART_IMAGE_CACHE_DIR elsewhere to put it on another disk.
 */
function cacheDir(): string {
  return (
    process.env.PART_IMAGE_CACHE_DIR?.trim() ??
    path.join(process.cwd(), ".cache", "part-images")
  );
}

/**
 * The widths that may be asked for.
 *
 * An allowlist, not a number from the query string. An open parameter is an
 * invitation to ask for ten thousand different widths of the same photograph,
 * each of which costs a decode, a resize and a file on disk.
 *
 * 600 is the grid at twice its 289px card, which is what a retina screen wants.
 * 900 covers a wider card if the layout ever changes.
 *
 * No full-size entry. Re-encoding the 1600x1200 originals to WebP was tried and
 * measured at 402KB against the JPEG's 393KB: the supplier's files are already
 * well compressed at that size. The detail page serves them untouched.
 */
const WIDTHS = new Set([600, 900]);

function readWidth(request: NextRequest): number | null {
  const asked = Number(request.nextUrl.searchParams.get("w"));
  return WIDTHS.has(asked) ? asked : null;
}

function cacheFile(imagePath: string, width: number | null): string {
  // The width is part of the key, or one size would be served for another.
  const digest = createHash("sha1")
    .update(width ? `${imagePath}@${width}` : imagePath)
    .digest("hex");
  // Two levels of fan-out: a single directory of 30,000 files is slow to stat.
  return path.join(cacheDir(), digest.slice(0, 2), `${digest}.bin`);
}

/**
 * A smaller copy, or the original if it cannot be made.
 *
 * A resize failing is not a reason to show no photograph, so anything that goes
 * wrong here falls back to sending what the supplier sent. `withoutEnlargement`
 * matters: a part whose only copy is already small must not be blown up, which
 * is the problem this whole route exists to solve.
 */
async function resized(body: Buffer, width: number) {
  try {
    const output = await sharp(body)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();

    return { body: output, type: "image/webp" };
  } catch {
    return null;
  }
}

function contentTypeFor(imagePath: string): string {
  const extension = imagePath.split(".").pop()?.toLowerCase();
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  if (extension === "gif") return "image/gif";
  return "image/jpeg";
}

function credentials(): string | null {
  const user = process.env.PARTS_API_USER;
  const password = process.env.PARTS_API_PASSWORD;
  if (!user || !password) return null;
  return Buffer.from(`${user}:${password}`).toString("base64");
}

function imageResponse(body: Buffer, type: string, cacheState: string) {
  return new Response(new Uint8Array(body), {
    headers: {
      "content-type": type,
      "cache-control": `public, max-age=${CACHE_SECONDS}, immutable`,
      "x-image-cache": cacheState,
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;
  const imagePath = `/${segments.join("/")}`;
  const width = readWidth(request);
  const type = width ? "image/webp" : contentTypeFor(imagePath);

  const cached = await readFile(cacheFile(imagePath, width)).catch(() => null);
  if (cached) return imageResponse(cached, type, "HIT");

  const auth = credentials();
  if (!auth) {
    return new Response("Parts API credentials are not configured", {
      status: 503,
    });
  }

  try {
    const upstream = await fetch(`${UPSTREAM}${UPSTREAM_PREFIX}${imagePath}`, {
      headers: { authorization: `Basic ${auth}`, accept: "image/*" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });

    if (!upstream.ok) {
      // Briefly cached: supplier outages are usually short, and a missing photo
      // should not be pinned in a browser cache for a month.
      return new Response(null, {
        status: upstream.status === 404 ? 404 : 502,
        headers: { "cache-control": "public, max-age=60" },
      });
    }

    const original = Buffer.from(await upstream.arrayBuffer());

    const smaller = width ? await resized(original, width) : null;
    const body = smaller?.body ?? original;
    const sent = smaller
      ? smaller.type
      : (upstream.headers.get("content-type") ?? type);

    // Best effort: a disk problem must slow the response, never fail it.
    const file = cacheFile(imagePath, smaller ? width : null);
    void mkdir(path.dirname(file), { recursive: true })
      .then(() => writeFile(file, body))
      .catch(() => {});

    return imageResponse(body, sent, "MISS");
  } catch {
    return new Response(null, {
      status: 504,
      headers: { "cache-control": "public, max-age=60" },
    });
  }
}

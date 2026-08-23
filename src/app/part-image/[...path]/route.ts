import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
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

function cacheFile(imagePath: string): string {
  const digest = createHash("sha1").update(imagePath).digest("hex");
  // Two levels of fan-out: a single directory of 30,000 files is slow to stat.
  return path.join(cacheDir(), digest.slice(0, 2), `${digest}.bin`);
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
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;
  const imagePath = `/${segments.join("/")}`;
  const type = contentTypeFor(imagePath);

  const cached = await readFile(cacheFile(imagePath)).catch(() => null);
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

    const body = Buffer.from(await upstream.arrayBuffer());

    // Best effort: a disk problem must slow the response, never fail it.
    const file = cacheFile(imagePath);
    void mkdir(path.dirname(file), { recursive: true })
      .then(() => writeFile(file, body))
      .catch(() => {});

    return imageResponse(
      body,
      upstream.headers.get("content-type") ?? type,
      "MISS",
    );
  } catch {
    return new Response(null, {
      status: 504,
      headers: { "cache-control": "public, max-age=60" },
    });
  }
}

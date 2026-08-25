import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import type { NextRequest } from "next/server";
import { mediaPath } from "@/lib/media/store";

/**
 * Serve an uploaded image.
 *
 * Uploads live outside the build directory so a deploy cannot delete them,
 * which means something has to hand them to the browser. That is this.
 *
 * The filenames carry random suffixes and a file is never rewritten under the
 * same name, so a long immutable cache is safe: an edited image is a new name.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;
  const file = mediaPath(segments);

  // Null means a segment failed validation, which is a request for something
  // outside the media directory rather than a missing image.
  if (!file) return new Response("Not found", { status: 404 });

  try {
    const info = await stat(file);
    if (!info.isFile()) return new Response("Not found", { status: 404 });

    const stream = createReadStream(file);

    return new Response(stream as unknown as ReadableStream, {
      headers: {
        "content-type": contentType(file),
        "content-length": String(info.size),
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

function contentType(file: string): string {
  if (file.endsWith(".webp")) return "image/webp";
  if (file.endsWith(".png")) return "image/png";
  if (file.endsWith(".avif")) return "image/avif";
  if (file.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}

import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

/**
 * Images uploaded from the admin.
 *
 * Written to disk under a configured directory and served back through
 * /media/..., rather than into `public/`. Files in `public/` are part of the
 * build: on a deploy that replaces the build directory, every image anybody
 * uploaded disappears. A directory of its own survives deploys and can be
 * backed up on its own.
 *
 * Everything is re-encoded to WebP on the way in. That is not only for size:
 * re-encoding through an image library means whatever arrives is decoded and
 * written out fresh, so a file that claims to be an image and is not never
 * reaches the disk, and neither does anything hidden in its metadata.
 */

/** What the browser may send. Anything else is refused by name and by content. */
const ACCEPTED = new Set([
  "image/webp",
  "image/jpeg",
  "image/png",
  "image/avif",
  "image/gif",
]);

/** One megabyte, as the owner asked. Checked before anything is decoded. */
export const MAX_UPLOAD_BYTES = 1024 * 1024;

/**
 * Nothing on the site is displayed above this. A 6000px photograph off a phone
 * is thirty times the pixels of the largest place it can appear.
 */
const MAX_WIDTH = 1600;

/** Visually indistinguishable at these sizes, and roughly a third the bytes. */
const WEBP_QUALITY = 82;

export type StoredImage = {
  url: string;
  width: number;
  height: number;
  bytes: number;
};

export type UploadFailure = { ok: false; message: string };
export type UploadSuccess = { ok: true; image: StoredImage };

function directory(): string {
  return (
    process.env.MEDIA_DIR?.trim() ?? path.join(process.cwd(), "content", "media")
  );
}

/**
 * Files are grouped by month, which keeps any one directory small enough to
 * list and makes it obvious what to archive when a year is long gone.
 */
function monthFolder(): string {
  const now = new Date();
  return `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * A name the uploader does not choose.
 *
 * An uploaded filename is attacker-controlled: it can carry a path, a
 * double extension, or the name of a file already there. This keeps a readable
 * hint of the original and appends randomness, so nothing can be guessed or
 * overwritten.
 */
function safeName(original: string): string {
  const base = path
    .basename(original, path.extname(original))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  return `${base || "image"}-${randomBytes(4).toString("hex")}.webp`;
}

export async function storeImage(
  file: File,
): Promise<UploadSuccess | UploadFailure> {
  if (!ACCEPTED.has(file.type)) {
    return {
      ok: false,
      message: "That file type is not accepted. Use WebP, JPEG, PNG or AVIF.",
    };
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    const megabytes = (file.size / 1024 / 1024).toFixed(1);
    return {
      ok: false,
      message: `That image is ${megabytes}MB. The limit is 1MB, so please resize it first.`,
    };
  }

  const input = Buffer.from(await file.arrayBuffer());

  let output: Buffer;
  let width: number;
  let height: number;

  try {
    const image = sharp(input, { animated: false });
    const meta = await image.metadata();

    // A file whose bytes are not an image fails here, whatever it claimed to be.
    if (!meta.width || !meta.height) {
      return { ok: false, message: "That file is not an image we can read." };
    }

    const resized =
      meta.width > MAX_WIDTH
        ? image.resize({ width: MAX_WIDTH, withoutEnlargement: true })
        : image;

    output = await resized.webp({ quality: WEBP_QUALITY, effort: 5 }).toBuffer();
    const written = await sharp(output).metadata();
    width = written.width ?? meta.width;
    height = written.height ?? meta.height;
  } catch {
    return { ok: false, message: "That image could not be read. Try another file." };
  }

  const folder = monthFolder();
  const name = safeName(file.name);
  const target = path.join(directory(), folder, name);

  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, output);

  return {
    ok: true,
    image: {
      url: `/media/${folder}/${name}`,
      width,
      height,
      bytes: output.length,
    },
  };
}

/** Where a stored image lives on disk, for the route that serves it. */
export function mediaPath(relative: string[]): string | null {
  /*
    Every segment is checked rather than the joined path. A request for
    /media/../../.env arrives as segments, and resolving first and checking
    afterwards is how directory traversal gets through.
  */
  if (relative.some((segment) => !/^[\w.-]+$/.test(segment) || segment === "..")) {
    return null;
  }

  return path.join(directory(), ...relative);
}

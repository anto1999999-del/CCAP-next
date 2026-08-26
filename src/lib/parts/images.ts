import type { CatalogPart, PartImage } from "./types";

/**
 * Where a part's photographs come from.
 *
 * The supplier stores images at paths like /v1/image/t/nw42/... on a plain HTTP
 * host that needs credentials and answers in one to three seconds. None of that
 * can be handed to a browser, so every image is served through this site at
 * /part-image/<their path>, which adds the credentials, caches the bytes and
 * keeps the request on HTTPS.
 */

export const PART_IMAGE_PREFIX = "/part-image";

/** Shown when a part has no photograph, or the supplier cannot produce it. */
export const PART_IMAGE_PLACEHOLDER = "/images/no-image.svg";

function proxied(path: string | null): string | null {
  if (!path) return null;
  // Already ours, e.g. when a part has been through here once.
  if (path.startsWith(PART_IMAGE_PREFIX)) return path;
  return `${PART_IMAGE_PREFIX}${path.startsWith("/") ? "" : "/"}${path}`;
}

/**
 * The photograph of the part itself, when there is one.
 *
 * Anything else is a stock image of the same part on another car, which is
 * worth showing but worth showing second.
 */
export function coverImage(part: CatalogPart): PartImage | null {
  const images = part.images ?? [];
  return images.find((image) => image.type === "Part") ?? images[0] ?? null;
}

export function thumbnailUrl(part: CatalogPart): string {
  const image = coverImage(part);
  return proxied(image?.thumb ?? image?.img ?? null) ?? PART_IMAGE_PLACEHOLDER;
}

/**
 * The large copy, exactly as the supplier sent it.
 *
 * Deliberately not re-encoded. Converting these to WebP was tried and measured:
 * a 393KB original came out at 402KB, because the supplier's JPEGs are already
 * well compressed at 1600x1200 and WebP has no advantage on photographic
 * content that size. It cost a decode and an encode to make the file slightly
 * bigger.
 *
 * The grid is different, and that is where the resizing earns its place: there
 * the win is 250px of detail becoming 600px, not the encoding.
 */
export function fullImageUrl(image: PartImage): string {
  return proxied(image.img ?? image.thumb) ?? PART_IMAGE_PLACEHOLDER;
}

/**
 * The small copy of one image.
 *
 * Worth asking for by name in a thumbnail strip: the supplier's small copies
 * are about 12KB against roughly 200KB for the full ones, and they are the
 * copies the overnight warm-up has already put on disk, so a strip of them
 * appears at once instead of a photograph at a time.
 */
export function thumbUrl(image: PartImage): string {
  return proxied(image.thumb ?? image.img) ?? PART_IMAGE_PLACEHOLDER;
}

/**
 * The large copy of a part's leading photograph.
 *
 * Used as the fallback behind the thumbnail: a handful of parts have the large
 * copy and not the small one, which is the same problem the other way around.
 */
export function fullPhotoUrl(part: CatalogPart): string {
  const image = coverImage(part);
  return proxied(image?.img ?? image?.thumb ?? null) ?? PART_IMAGE_PLACEHOLDER;
}

/**
 * The copy to show in a grid.
 *
 * Made from the supplier's original rather than its thumbnail, because the
 * thumbnail is 250x187 and a card is 289 CSS pixels wide: on any retina screen
 * that is a 2.3x upscale, which is the blur. The original is 1600x1200 and
 * twenty of those is five megabytes of page.
 *
 * So the proxy resizes one to 600px and keeps it, which is what a 289px card
 * wants at twice the density and about 30KB. A part with only a thumbnail
 * falls back to it and is not enlarged.
 */
export function gridImageUrl(part: CatalogPart): string {
  const image = coverImage(part);
  const source = image?.img ?? image?.thumb ?? null;
  const url = proxied(source);

  return url ? `${url}?w=600` : PART_IMAGE_PLACEHOLDER;
}

export function hasPhoto(part: CatalogPart): boolean {
  return (part.images ?? []).some((image) => Boolean(image.thumb || image.img));
}

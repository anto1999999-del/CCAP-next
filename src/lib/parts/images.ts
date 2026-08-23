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

export function fullImageUrl(image: PartImage): string {
  return proxied(image.img ?? image.thumb) ?? PART_IMAGE_PLACEHOLDER;
}

export function hasPhoto(part: CatalogPart): boolean {
  return (part.images ?? []).some((image) => Boolean(image.thumb || image.img));
}

import type { CatalogPart, PartImage } from "./types";

/**
 * Parts that have not yet been taken off the car they came from.
 *
 * A wrecker lists a car's parts when the car arrives, long before each one is
 * removed. The feed has no "still fitted" field, but Pinnacle gives a part its
 * shelf tag when it is pulled and stocked, and on 15 Oct 2026 the two lined up
 * exactly: all 25,391 parts without a tag had no photograph of their own, only
 * photographs of the donor car, while tagged parts had their own. So an empty
 * tag is the signal.
 *
 * It matters to the buyer because a fitted part has to be removed before it
 * can be sent, so it does not leave as quickly as one already on the shelf,
 * and the photo on the listing is the car rather than the part. The owner asked
 * for both to be said plainly (15 Oct 2026); the wording is his.
 */

export const STILL_FITTED_NOTICE =
  "Still fitted to the donor vehicle. Please contact the store to confirm removal and dispatch timing.";

export const VEHICLE_PHOTOS_NOTICE =
  "Images show the donor vehicle, not the individual part.";

/** True when the part is still on the car it came from. */
export function stillOnDonorVehicle(part: Pick<CatalogPart, "tag">): boolean {
  return !part.tag?.trim();
}

/**
 * True when every photo shown is of the car, none of the part.
 *
 * The feed labels each image "Part" or "Vehicle". Decided on the images the
 * page actually shows rather than on the tag, because a pulled part can still
 * be listed with nothing but photos of the car.
 */
export function onlyVehiclePhotos(images: readonly PartImage[]): boolean {
  return images.length > 0 && !images.some((image) => image.type === "Part");
}

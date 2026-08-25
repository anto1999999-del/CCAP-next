import profiles from "../../../content/shipping/part-dimensions.json";
import type { CatalogPart } from "../parts/types";

/**
 * How big and heavy a part is.
 *
 * The supplier's catalogue does not carry weights or dimensions, and the
 * carrier will not quote without them. So the yard measured 257 kinds of part,
 * and that table is what turns "one gearbox" into something a freight company
 * can price.
 *
 * The matching is deliberately forgiving, because the three fields it can match
 * on are all written by hand at the yard: the part type code, the first line of
 * the interchange description, and the item name. It tries an exact match on
 * each, then ignores spacing, then falls back to the longest table entry
 * contained in the text. A wrong guess quotes the wrong freight, so the order
 * runs from most certain to least.
 */

export type ShippingProfile = {
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
};

const TABLE = profiles as Record<string, ShippingProfile>;

/** Longest first, so "REAR DIFF ASSEMBLY" wins over "DIFF". */
const KEYS_BY_LENGTH = Object.keys(TABLE).sort((a, b) => b.length - a.length);

/** Punctuation and casing vary; the words do not. */
export function normaliseKey(value: unknown): string {
  return String(value ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function withoutSpaces(value: string): string {
  return value.replace(/\s+/g, "");
}

/** The fields worth matching on, most reliable first. */
function candidates(part: Pick<CatalogPart, "itemTypeCode" | "icDesc" | "itemName">): string[] {
  const firstLineOfDescription = part.icDesc?.split(/\n|;|\|/)[0]?.trim() ?? "";

  return [
    normaliseKey(part.itemTypeCode),
    normaliseKey(firstLineOfDescription),
    normaliseKey(part.itemName),
  ].filter((candidate) => candidate.length >= 2);
}

export function lookupShippingProfile(
  part: Pick<CatalogPart, "itemTypeCode" | "icDesc" | "itemName">,
): ShippingProfile | null {
  const options = candidates(part);

  for (const option of options) {
    if (option.length >= 3 && TABLE[option]) return TABLE[option];
  }

  // "TAIL SHAFT" against "TAILSHAFT".
  for (const option of options) {
    const collapsed = withoutSpaces(option);
    if (collapsed.length < 3) continue;
    const match = KEYS_BY_LENGTH.find(
      (key) => withoutSpaces(key) === collapsed,
    );
    if (match) return TABLE[match];
  }

  // "FRONT LEFT DOOR SHELL" contains "DOOR SHELL".
  for (const option of options) {
    if (option.length < 4) continue;
    const match = KEYS_BY_LENGTH.find(
      (key) => key.length >= 4 && option.includes(key),
    );
    if (match) return TABLE[match];
  }

  /*
    And the other way around, which is where most of the misses were.

    The yard measured parts by position: the table holds "HEADREST RH REAR",
    "CALIPER RH REAR", "ABS SENSOR LH REAR". The catalogue codes them without
    the position: HEADREST, CALIPER, ABS_SENSOR. Neither this matcher nor the
    one on the current site looked for a table entry that *starts with* the
    part's name, so 4,542 parts fell through to a default and were quoted as
    though they weighed a kilogram. A front seat is not a kilogram.

    The shortest match wins, as the least specific and so the most likely to be
    the plain version of the part. Positional variants of the same part have
    near enough the same dimensions anyway.
  */
  for (const option of options) {
    if (option.length < 5) continue;
    const match = [...KEYS_BY_LENGTH]
      .reverse()
      .find((key) => key.startsWith(`${option} `));
    if (match) return TABLE[match];
  }

  return null;
}

/** Cubic metres, which is what the carrier prices on for anything bulky. */
export function volumeM3(profile: ShippingProfile): number {
  return (
    (profile.lengthCm / 100) * (profile.widthCm / 100) * (profile.heightCm / 100)
  );
}

export function profileCount(): number {
  return KEYS_BY_LENGTH.length;
}

/**
 * What to assume for a part nobody measured.
 *
 * Deliberately not a small box. An unmeasured part quoted at a kilogram means
 * the customer is charged for a parcel and the yard pays for a pallet, and the
 * difference comes out of the sale. This is the 75th percentile of everything
 * in the table: larger than most parts, so the error falls on the safe side,
 * and the yard confirms the real freight before it ships.
 */
export const ASSUMED_PROFILE: ShippingProfile = {
  weightKg: 15,
  lengthCm: 60,
  widthCm: 45,
  heightCm: 40,
};

/** The profile to quote with, and whether it is a real measurement. */
export function shippingProfileFor(
  part: Pick<CatalogPart, "itemTypeCode" | "icDesc" | "itemName">,
): { profile: ShippingProfile; measured: boolean } {
  const profile = lookupShippingProfile(part);
  return profile
    ? { profile, measured: true }
    : { profile: ASSUMED_PROFILE, measured: false };
}

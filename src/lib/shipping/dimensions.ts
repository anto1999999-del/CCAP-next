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

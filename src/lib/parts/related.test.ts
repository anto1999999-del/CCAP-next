import { expect, test } from "vitest";
import { partKey } from "./identity";
import { relatedParts } from "./related";
import type { CatalogPart } from "./types";

/**
 * The related-parts row is the internal linking for most of the catalogue, so
 * the property that matters is coverage: across a vehicle's parts, every part
 * should be linked from somewhere.
 */

let next = 100;
function part(overrides: Partial<CatalogPart> = {}): CatalogPart {
  next += 1;
  return {
    urgId: "nw42",
    invNumber: String(next),
    stockNo: "CC0001",
    // Distinct names, so no two are twins of each other.
    itemName: `Part ${next}`,
    manufacturer: "HYUNDAI",
    model: "IX35",
    year: "2014",
    longIcYear: null,
    itemTypeCode: "MISC",
    icDesc: null,
    price: 100,
    tag: null,
    odoReading: null,
    comments: null,
    images: null,
    ...overrides,
  } as CatalogPart;
}

test("every part in a vehicle is linked from another part", () => {
  const group = Array.from({ length: 30 }, () => part());
  const catalogue = [...group, part({ manufacturer: "TOYOTA", model: "RAV4" })];

  const linked = new Set<string>();
  for (const p of group) {
    for (const other of relatedParts(p, catalogue)) linked.add(partKey(other)!);
  }

  expect(linked.size).toBe(group.length);
});

test("shows four parts of the same vehicle, never the part itself", () => {
  const group = Array.from({ length: 10 }, () => part());
  const catalogue = [...group, part({ model: "TUCSON" })];

  const shown = relatedParts(group[3], catalogue);
  expect(shown).toHaveLength(4);
  expect(shown.map(partKey)).not.toContain(partKey(group[3]));
  expect(shown.every((p) => p.model === "IX35")).toBe(true);
});

test("priced parts come first, unpriced ones only fill a short row", () => {
  const priced = [part(), part()];
  const unpriced = [part({ price: 0 }), part({ price: 0 }), part({ price: 0 })];
  const catalogue = [...priced, ...unpriced];

  const shown = relatedParts(priced[0], catalogue);
  expect(shown).toHaveLength(4);
  expect(partKey(shown[0])).toBe(partKey(priced[1]));
  expect(shown.slice(1).every((p) => Number(p.price) === 0)).toBe(true);
});

test("the same part shows the same neighbours whatever order the feed is in", () => {
  const group = Array.from({ length: 8 }, () => part());
  const forwards = relatedParts(group[2], group).map(partKey);
  const backwards = relatedParts(group[2], [...group].reverse()).map(partKey);
  expect(backwards).toEqual(forwards);
});

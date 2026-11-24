import { expect, test } from "vitest";
import { searchCatalog } from "./query";
import { correctQuery, rankByName } from "./search";
import { EMPTY_FILTERS, type CatalogPart } from "./types";

/**
 * The parts search forgiving what customers type (W-008, 24 Nov 2026).
 *
 * Checked on the live catalogue first: "corola headlight", "forrester
 * radiator" and "i30 alternater" found nothing, "carnival door" led with
 * window switches, and "hilux gearbox" stopped at "Nothing matches" although
 * HiLux parts and gearboxes were both in stock.
 */

let next = 0;
function part(overrides: Partial<CatalogPart> = {}): CatalogPart {
  next += 1;
  return {
    urgId: "nw42",
    invNumber: String(100000 + next),
    stockNo: `CC${String(next).padStart(4, "0")}`,
    itemName: "Engine",
    manufacturer: "TOYOTA",
    model: "COROLLA",
    year: "2015",
    longIcYear: null,
    itemTypeCode: "ENGINE",
    icDesc: null,
    price: 500,
    tag: null,
    odoReading: null,
    comments: null,
    images: null,
    ...overrides,
  };
}

const headlamp = (model: string, make = "TOYOTA") =>
  part({
    manufacturer: make,
    model,
    itemName: "Right Headlamp",
    itemTypeCode: "RIGHT_HEADLAMP",
  });

const catalog: CatalogPart[] = [
  headlamp("COROLLA"),
  headlamp("COROLLA"),
  headlamp("COROLLA"),
  headlamp("FORESTER", "SUBARU"),
  headlamp("FORESTER", "SUBARU"),
  headlamp("FORESTER", "SUBARU"),
  part({ model: "HILUX", itemName: "Grille", itemTypeCode: "GRILLE" }),
  part({
    model: "RAV4",
    itemName: "Trans/Gearbox",
    itemTypeCode: "TRANS_GEARBOX",
  }),
  part({
    manufacturer: "KIA",
    model: "CARNIVAL",
    itemName: "Pwr Dr Wind Switch",
    itemTypeCode: "PWR_DR_WIND_SWITCH",
  }),
  part({
    manufacturer: "KIA",
    model: "CARNIVAL",
    itemName: "Left Front Door",
    itemTypeCode: "LEFT_FRONT_DOOR",
  }),
];

const search = (query: string) =>
  searchCatalog({ catalog, filters: EMPTY_FILTERS, query });

test("a misspelt model is read as the closest catalogue word", () => {
  expect(correctQuery(catalog, "corola headlight")).toEqual(
    "corolla headlight",
  );
  expect(correctQuery(catalog, "corrolla headlight")).toEqual(
    "corolla headlight",
  );
  expect(correctQuery(catalog, "forrester headlight")).toEqual(
    "forester headlight",
  );
});

test("a misspelt search finds the parts and says what it searched for", () => {
  const outcome = search("corola headlight");
  expect(outcome.ordered).toHaveLength(3);
  expect(outcome.correctedQuery).toEqual("corolla headlight");
});

test("a search that already finds parts is never corrected", () => {
  const outcome = search("corolla headlight");
  expect(outcome.ordered).toHaveLength(3);
  expect(outcome.correctedQuery).toBeNull();
  expect(outcome.suggestions).toEqual([]);
});

test("numbers, short words and known words are left alone", () => {
  expect(correctQuery(catalog, "CC0420")).toBeNull();
  expect(correctQuery(catalog, "2015 corolla")).toBeNull();
  expect(correctQuery(catalog, "head")).toBeNull();
});

test("nothing in stock offers the narrower searches that are", () => {
  const outcome = search("hilux gearbox");
  expect(outcome.ordered).toEqual([]);
  expect(outcome.suggestions).toEqual([
    { query: "gearbox", count: 1 },
    { query: "hilux", count: 1 },
  ]);
});

test("a bare series number is not offered on its own", () => {
  const outcome = search("hilux 200 gearbox");
  expect(outcome.suggestions.map((s) => s.query)).not.toContain("200 gearbox");
  expect(outcome.suggestions.map((s) => s.query)).toContain("gearbox");
});

test("the part itself comes before parts that only mention it", () => {
  const [first] = search("carnival door").ordered;
  expect(first.itemName).toEqual("Left Front Door");
});

test("a word inside another word does not lift a part", () => {
  const trim = part({ itemName: "Door Trim", itemTypeCode: "DOOR_TRIM" });
  const mag = part({ itemName: "Wheel Mag", itemTypeCode: "WHEEL_MAG" });
  expect(rankByName([trim, mag], "rim")[0]).toBe(mag);
});

test("a stock number finds that vehicle's parts", () => {
  const stockNo = catalog[6].stockNo;
  expect(search(stockNo ?? "").ordered).toEqual([catalog[6]]);
});

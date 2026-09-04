import { expect, test } from "vitest";
import { arrangeParts, hasPrice } from "./arrange";
import { priceState, toCents } from "./price";
import { deriveFilterOptions, filterParts } from "./filter";
import { canonicalPathFor, dedupeParts, isCanonicalListing } from "./identity";
import { vehicleLabel } from "./format";
import { matchesPartType } from "./part-type";
import { queryParts } from "./query";
import { matchesQuery, parseSearchQuery } from "./search";
import { EMPTY_FILTERS, type CatalogPart } from "./types";

/**
 * The catalogue rules, checked.
 *
 * These are the behaviours customers noticed when they were wrong: engine
 * searches returning engine covers, year searches missing parts that fit the
 * year, and pages filled with one dismantled car. They are pure functions
 * precisely so they can be checked like this.
 *
 *   npm test
 */

function part(overrides: Partial<CatalogPart> = {}): CatalogPart {
  return {
    urgId: "nw42",
    invNumber: String(Math.random()).slice(2, 8),
    stockNo: "CC0001",
    itemName: "Engine",
    manufacturer: "TOYOTA",
    model: "RAV4",
    year: "2015",
    longIcYear: null,
    itemTypeCode: "ENGINE",
    icDesc: null,
    price: 1500,
    tag: null,
    odoReading: null,
    comments: null,
    images: null,
    ...overrides,
  };
}

test("a part type filter matches the whole code, not a substring", () => {
  expect(matchesPartType(part({ itemTypeCode: "ENGINE" }), "engine")).toEqual(
    true,
  );
  expect(
    matchesPartType(part({ itemTypeCode: "ENGINE_COVER" }), "engine"),
  ).toEqual(false);
});

test("part type aliases map to the supplier's codes", () => {
  expect(matchesPartType(part({ itemTypeCode: "ENGINE" }), "motor")).toEqual(
    true,
  );
  expect(
    matchesPartType(part({ itemTypeCode: "GEARBOX" }), "transmission"),
  ).toEqual(true);
});

test("a gearbox search finds the code the catalogue actually uses", () => {
  // All 234 gearboxes are filed under TRANS_GEARBOX. The live site maps the
  // word to GEARBOX alone, so searching it there returns nothing.
  const gearbox = part({
    itemTypeCode: "TRANS_GEARBOX",
    itemName: "Trans/Gearbox",
  });
  expect(matchesPartType(gearbox, "gearbox")).toEqual(true);
  expect(matchesPartType(gearbox, "transmission")).toEqual(true);
  expect(matchesQuery(gearbox, "gearbox")).toEqual(true);

  // Still not a transfer case or a diff, which are their own parts.
  expect(
    matchesPartType(part({ itemTypeCode: "TRANSFER_CASE" }), "gearbox"),
  ).toEqual(false);
});

test("a year filter also matches the years a part interchanges into", () => {
  const fits = part({ year: "2015", longIcYear: ["2013", "2014", "2016"] });
  const matched = filterParts([fits], { ...EMPTY_FILTERS, year: "2016" });
  expect(matched.length).toEqual(1);

  const missed = filterParts([fits], { ...EMPTY_FILTERS, year: "2019" });
  expect(missed.length).toEqual(0);
});

test("make and model match in either direction", () => {
  const prado = part({ manufacturer: "TOYOTA", model: "LANDCRUISER PRADO" });
  expect(
    filterParts([prado], { ...EMPTY_FILTERS, model: "PRADO" }).length,
  ).toEqual(1);
  expect(
    filterParts([prado], { ...EMPTY_FILTERS, model: "LANDCRUISER PRADO 150" })
      .length,
  ).toEqual(1);
  expect(
    filterParts([prado], { ...EMPTY_FILTERS, model: "HILUX" }).length,
  ).toEqual(0);
});

test("duplicate rows from the supplier's paging are dropped", () => {
  const one = part({ urgId: "nw42", invNumber: "8750" });
  const same = part({ urgId: "NW42", invNumber: "8750" });
  expect(dedupeParts([one, same]).length).toEqual(1);
});

test("priced parts come before parts with no price", () => {
  const priced = part({ price: 500 });
  const unpriced = part({ price: 1 });
  const order = arrangeParts([unpriced, priced], true);
  expect(hasPrice(order[0])).toEqual(true);
  expect(hasPrice(order[1])).toEqual(false);
});

test("an unfiltered page is spread across vehicles, not filled with one car", () => {
  const mazda = Array.from({ length: 5 }, () =>
    part({ manufacturer: "MAZDA", model: "CX9" }),
  );
  const ford = Array.from({ length: 5 }, () =>
    part({ manufacturer: "FORD", model: "RANGER" }),
  );

  const spread = arrangeParts([...mazda, ...ford], false);
  expect(spread[0].manufacturer).toEqual("MAZDA");
  expect(spread[1].manufacturer).toEqual("FORD");

  // Once a make is chosen the customer asked for one vehicle, so leave it be.
  const kept = arrangeParts([...mazda, ...ford], true);
  expect(kept[1].manufacturer).toEqual("MAZDA");
});

test("a page number past the end shows the last page, not an empty one", () => {
  const catalog = Array.from({ length: 25 }, () => part());
  const page = queryParts({
    catalog,
    filters: EMPTY_FILTERS,
    page: 99,
    pageSize: 20,
  });

  expect(page.page).toEqual(2);
  expect(page.pageCount).toEqual(2);
  expect(page.parts.length).toEqual(5);
  expect(page.totalResults).toEqual(25);
});

test("filtering happens before paging, so page one is full", () => {
  const catalog = [
    ...Array.from({ length: 40 }, () => part({ manufacturer: "FORD" })),
    ...Array.from({ length: 5 }, () => part({ manufacturer: "KIA" })),
  ];

  const page = queryParts({
    catalog,
    filters: { ...EMPTY_FILTERS, make: "KIA" },
    pageSize: 20,
  });

  expect(page.totalResults).toEqual(5);
  expect(page.parts.length).toEqual(5);
  expect(page.pageCount).toEqual(1);
});

test("every word in a search has to match something", () => {
  const hilux = part({
    itemName: "Front Bumper",
    manufacturer: "TOYOTA",
    model: "HILUX",
    year: "2015",
    itemTypeCode: "FRONT_BUMPER",
  });

  expect(matchesQuery(hilux, "hilux bumper")).toEqual(true);
  expect(matchesQuery(hilux, "hilux gearbox")).toEqual(false);
});

test("searching for engine means engines, not engine covers", () => {
  expect(
    matchesQuery(
      part({ itemTypeCode: "ENGINE_COVER", itemName: "Engine Cover" }),
      "engine",
    ),
  ).toEqual(false);
  expect(matchesQuery(part({ itemTypeCode: "ENGINE" }), "engine")).toEqual(
    true,
  );
});

test("a typed query is read as year, make and model", () => {
  expect(parseSearchQuery("2022 lexus es")).toEqual({
    year: "2022",
    make: "LEXUS",
    model: "es",
  });
});

test("filter options cascade with what is already chosen", () => {
  const catalog = [
    part({
      year: "2015",
      manufacturer: "TOYOTA",
      model: "HILUX",
      itemTypeCode: "ENGINE",
    }),
    part({
      year: "2015",
      manufacturer: "MAZDA",
      model: "CX9",
      itemTypeCode: "GEARBOX",
    }),
    part({
      year: "2001",
      manufacturer: "HOLDEN",
      model: "COMMODORE",
      itemTypeCode: "ENGINE",
    }),
  ];

  const all = deriveFilterOptions(catalog, EMPTY_FILTERS);
  expect(all.years).toEqual(
    ["2015", "2015", "2001"].filter((y, i, a) => a.indexOf(y) === i),
  );
  expect(all.makes).toEqual(["HOLDEN", "MAZDA", "TOYOTA"]);

  const in2015 = deriveFilterOptions(catalog, {
    ...EMPTY_FILTERS,
    year: "2015",
  });
  expect(in2015.makes).toEqual(["MAZDA", "TOYOTA"]);

  const toyota = deriveFilterOptions(catalog, {
    ...EMPTY_FILTERS,
    year: "2015",
    make: "TOYOTA",
  });
  expect(toyota.models).toEqual(["HILUX"]);

  const hilux = deriveFilterOptions(catalog, {
    ...EMPTY_FILTERS,
    year: "2015",
    make: "TOYOTA",
    model: "HILUX",
  });
  expect(hilux.partTypes).toEqual(["ENGINE"]);
});

/*
  What the supplier means by a price, which is three different things.

  These decide what the whole catalogue shows: a wrong boundary either hides
  9,236 real parts or publishes 125 complete vehicles the yard does not sell
  online. Both are visible on the site within a minute of a sync.
*/

test("anything above a dollar is a real price and can be sold", () => {
  expect(priceState(450)).toBe("sellable");
  expect(priceState("1.01")).toBe("sellable");
  expect(priceState(3300)).toBe("sellable");
});

test("exactly zero means nobody has priced it yet, so it is shown and asked about", () => {
  expect(priceState(0)).toBe("on-request");
  expect(priceState("0.00")).toBe("on-request");
});

test("exactly a dollar is a whole vehicle, not a part, and is withheld", () => {
  expect(priceState(1)).toBe("withheld");
  expect(priceState("1.00")).toBe("withheld");
});

test("a missing or unreadable price is asked about rather than hidden", () => {
  // Hiding stock the yard actually holds is the worse of the two mistakes.
  expect(priceState(null)).toBe("on-request");
  expect(priceState(undefined)).toBe("on-request");
  expect(priceState("not a number")).toBe("on-request");
});

test("neither unsellable state can ever produce a charge", () => {
  // toCents is what money is computed from. Zero and a dollar must come back
  // null, not 0, so the caller has to handle it rather than charging nothing.
  expect(toCents(0)).toBeNull();
  expect(toCents(1)).toBeNull();
  expect(toCents(450)).toBe(45000);
});

test("only sellable parts count as priced when the grid orders them", () => {
  const part = (price: number) =>
    ({ urgId: "x", invNumber: "1", price }) as never;
  expect(hasPrice(part(450))).toBe(true);
  expect(hasPrice(part(0))).toBe(false);
  expect(hasPrice(part(1))).toBe(false);
});

/*
  The headline year is the donor vehicle, not the start of the fitment range.

  A door off a 2019 Ranger fits 2011-2022, and the site used to headline it
  "2011 FORD RANGER" -- until the owner asked why it was aging his stock by
  eight years (1 Sep 2026). Search by any fitment year still works: the year
  filter above matches longIcYear.
*/

test("the headline year is the donor vehicle, not the oldest year it fits", () => {
  const door = part({
    manufacturer: "FORD",
    model: "RANGER",
    year: "2019",
    longIcYear: ["2011", "2012", "2019", "2022"],
  });

  expect(vehicleLabel(door)).toEqual("2019 FORD RANGER");
});

test("with no donor year recorded, the fitment range still supplies one", () => {
  const orphan = part({
    manufacturer: "KIA",
    model: "CERATO",
    year: null,
    longIcYear: ["2018", "2019"],
  });

  expect(vehicleLabel(orphan)).toEqual("2018 KIA CERATO");
});

test("same part off different-year donors is two listings, same donor is one", () => {
  const base = {
    itemName: "Door Trim",
    manufacturer: "FORD",
    model: "RANGER",
    longIcYear: ["2018", "2019", "2020", "2021", "2022"],
  };
  const off2019 = part({ ...base, year: "2019", invNumber: "1" });
  const off2021 = part({ ...base, year: "2021", invNumber: "2" });
  const off2021b = part({ ...base, year: "2021", invNumber: "3" });
  const yard = [off2019, off2021, off2021b];

  // Different donors are different physical vehicles: each holds its own page.
  expect(isCanonicalListing(off2019, yard)).toEqual(true);

  // The two trims off 2021 donors are the duplicate case: one page between
  // them, and the loser's canonical points at the winner.
  const winners = [off2021, off2021b].filter((trim) =>
    isCanonicalListing(trim, yard),
  );
  expect(winners.length).toEqual(1);
  expect(canonicalPathFor(off2021, yard)).toEqual(
    canonicalPathFor(off2021b, yard),
  );
  expect(canonicalPathFor(off2019, yard)).not.toEqual(
    canonicalPathFor(off2021, yard),
  );
});

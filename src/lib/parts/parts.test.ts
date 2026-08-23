import { expect, test } from "vitest";
import { arrangeParts, hasPrice } from "./arrange";
import { deriveFilterOptions, filterParts } from "./filter";
import { dedupeParts } from "./identity";
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
    images: null,
    ...overrides,
  };
}

test("a part type filter matches the whole code, not a substring", () => {
  expect(matchesPartType(part({ itemTypeCode: "ENGINE" }), "engine")).toEqual(true);
  expect(matchesPartType(part({ itemTypeCode: "ENGINE_COVER" }), "engine")).toEqual(false);
});

test("part type aliases map to the supplier's codes", () => {
  expect(matchesPartType(part({ itemTypeCode: "GEARBOX" }), "transmission")).toEqual(true);
  expect(matchesPartType(part({ itemTypeCode: "ENGINE" }), "motor")).toEqual(true);
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
  expect(filterParts([prado], { ...EMPTY_FILTERS, model: "PRADO" }).length).toEqual(1);
  expect(filterParts([prado], { ...EMPTY_FILTERS, model: "LANDCRUISER PRADO 150" })
      .length).toEqual(1);
  expect(filterParts([prado], { ...EMPTY_FILTERS, model: "HILUX" }).length).toEqual(0);
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
  expect(matchesQuery(part({ itemTypeCode: "ENGINE_COVER", itemName: "Engine Cover" }), "engine")).toEqual(false);
  expect(matchesQuery(part({ itemTypeCode: "ENGINE" }), "engine")).toEqual(true);
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
    part({ year: "2015", manufacturer: "TOYOTA", model: "HILUX", itemTypeCode: "ENGINE" }),
    part({ year: "2015", manufacturer: "MAZDA", model: "CX9", itemTypeCode: "GEARBOX" }),
    part({ year: "2001", manufacturer: "HOLDEN", model: "COMMODORE", itemTypeCode: "ENGINE" }),
  ];

  const all = deriveFilterOptions(catalog, EMPTY_FILTERS);
  expect(all.years).toEqual(["2015", "2015", "2001"].filter((y, i, a) => a.indexOf(y) === i));
  expect(all.makes).toEqual(["HOLDEN", "MAZDA", "TOYOTA"]);

  const in2015 = deriveFilterOptions(catalog, { ...EMPTY_FILTERS, year: "2015" });
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

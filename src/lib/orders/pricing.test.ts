import { expect, test } from "vitest";
import { orderTotal, priceOrder } from "./pricing";
import type { CatalogPart } from "../parts/types";

/**
 * Order pricing.
 *
 * The point of these is one property: nothing a customer sends can change what
 * they are charged. The current site fails that, and it is the difference
 * between a shop and a donation box.
 *
 *   npm test
 */

function part(overrides: Partial<CatalogPart> = {}): CatalogPart {
  return {
    urgId: "nw42",
    invNumber: "1000",
    stockNo: "CC0001",
    itemName: "Engine",
    manufacturer: "TOYOTA",
    model: "HIACE",
    year: "2016",
    longIcYear: null,
    itemTypeCode: "ENGINE",
    icDesc: null,
    price: 3300,
    tag: null,
    odoReading: null,
    comments: null,
    images: null,
    ...overrides,
  };
}

test("prices come from the catalogue, never from the request", () => {
  const catalog = [part({ invNumber: "1000", price: 3300 })];

  const order = priceOrder(catalog, [
    // A request carrying its own idea of the price, as a tampered one would.
    { urgId: "nw42", invNumber: "1000", quantity: 1, price: 1 } as never,
  ]);

  expect(order.subtotalCents).toEqual(330000);
  expect(order.lines[0].unitCents).toEqual(330000);
});

test("a part that has sold is reported, not silently priced", () => {
  const order = priceOrder([], [
    { urgId: "nw42", invNumber: "9999", quantity: 1 },
  ]);

  expect(order.lines).toEqual([]);
  expect(order.problems[0].reason).toEqual("sold");
  expect(order.subtotalCents).toEqual(0);
});

test("an unpriced part cannot be bought online", () => {
  const catalog = [part({ invNumber: "1001", price: 1, itemName: "Tail Shaft" })];

  const order = priceOrder(catalog, [
    { urgId: "nw42", invNumber: "1001", quantity: 1 },
  ]);

  expect(order.lines).toEqual([]);
  expect(order.problems[0].reason).toEqual("not-priced");
  expect(order.problems[0].message).toContain("Tail Shaft");
});

test("quantities are clamped rather than trusted", () => {
  const catalog = [part({ invNumber: "1000", price: 100 })];

  const silly = priceOrder(catalog, [
    { urgId: "nw42", invNumber: "1000", quantity: 5000 },
  ]);
  expect(silly.lines[0].quantity).toEqual(20);

  const negative = priceOrder(catalog, [
    { urgId: "nw42", invNumber: "1000", quantity: -3 },
  ]);
  expect(negative.lines[0].quantity).toEqual(1);

  const fractional = priceOrder(catalog, [
    { urgId: "nw42", invNumber: "1000", quantity: 2.7 },
  ]);
  expect(fractional.lines[0].quantity).toEqual(2);
});

test("a line is quantity times the catalogue price, in whole cents", () => {
  const catalog = [part({ invNumber: "1000", price: 199.99 })];

  const order = priceOrder(catalog, [
    { urgId: "nw42", invNumber: "1000", quantity: 3 },
  ]);

  expect(order.lines[0].unitCents).toEqual(19999);
  expect(order.lines[0].lineCents).toEqual(59997);
  expect(order.subtotalCents).toEqual(59997);
});

test("freight is added to the parts, not folded into them", () => {
  const catalog = [part({ invNumber: "1000", price: 500 })];
  const order = priceOrder(catalog, [
    { urgId: "nw42", invNumber: "1000", quantity: 2 },
  ]);

  expect(orderTotal(order, 12155)).toEqual({
    subtotalCents: 100000,
    freightCents: 12155,
    totalCents: 112155,
  });
});

test("a negative freight quote cannot discount the parts", () => {
  const catalog = [part({ invNumber: "1000", price: 500 })];
  const order = priceOrder(catalog, [
    { urgId: "nw42", invNumber: "1000", quantity: 1 },
  ]);

  expect(orderTotal(order, -9999).totalCents).toEqual(50000);
});

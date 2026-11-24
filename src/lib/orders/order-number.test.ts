import { expect, test } from "vitest";
import { readPinnacleStatus } from "@/lib/supplier/pinnacle-order";
import { orderNumberMatches } from "./order-number";

/**
 * Finding an order by its short reference or its Pinnacle work order number,
 * and reading that number from Pinnacle (W-007, 24 Nov 2026).
 */

const byIdEnd = (text: string) => ({
  $expr: {
    $regexMatch: {
      input: { $toString: "$_id" },
      regex: `${text}$`,
      options: "i",
    },
  },
});

test("the six-character reference from the emails finds the order", () => {
  expect(orderNumberMatches("42527B")).toEqual([byIdEnd("42527B")]);
  expect(orderNumberMatches("#a9f755")).toEqual([byIdEnd("a9f755")]);
});

test("a number is tried as a work order and as the end of an order id", () => {
  expect(orderNumberMatches("251876")).toEqual([
    byIdEnd("251876"),
    { "supplierOrder.proOrderNumber": 251876 },
  ]);
  expect(orderNumberMatches("123")).toEqual([
    { "supplierOrder.proOrderNumber": 123 },
  ]);
});

test("names and part words add nothing", () => {
  expect(orderNumberMatches("smith")).toEqual([]);
  expect(orderNumberMatches("hilux gearbox")).toEqual([]);
  // Only hex can be part of an id, so nothing unsafe reaches the regex.
  expect(orderNumberMatches("a.*b")).toEqual([]);
});

test("Pinnacle's number is read once it has imported the order", () => {
  expect(
    readPinnacleStatus(
      JSON.stringify({ proOrderNumber: 48213, proMessage: "Imported" }),
    ),
  ).toEqual({ proOrderNumber: 48213, proMessage: "Imported" });
});

test("0 means queued, not imported, so there is no number yet", () => {
  // The shape the live API returned for all five sent orders on 24 Nov 2026.
  expect(
    readPinnacleStatus(
      JSON.stringify({
        orderJson: "{}",
        urgId: "nw42",
        externalOrderReference: "x",
        proMessage: "",
        proOrderNumber: 0,
      }),
    ),
  ).toEqual({ proOrderNumber: null, proMessage: "" });
});

test("an unreadable reply is no answer rather than an error", () => {
  expect(readPinnacleStatus("<html>502</html>")).toBeNull();
  expect(readPinnacleStatus("null")).toBeNull();
});

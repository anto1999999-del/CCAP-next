import { expect, test } from "vitest";
import {
  AWAITING_PAYMENT,
  orderListFilter,
  PAID_AND_VISIBLE,
} from "./list-filter";

/**
 * The back office's order filters (W-005, 24 Nov 2026). Checked against the
 * Mongo filter each one builds, which is the whole rule: what a tab shows is
 * exactly what this object selects.
 */

test("'All' shows visible orders that are not awaiting payment", () => {
  expect(orderListFilter("", "")).toEqual({
    hidden: { $ne: true },
    status: { $ne: AWAITING_PAYMENT },
  });
});

test("'Awaiting payment' shows only visible unpaid orders", () => {
  expect(orderListFilter(AWAITING_PAYMENT, "")).toEqual({
    hidden: { $ne: true },
    status: AWAITING_PAYMENT,
  });
});

test("a status tab shows that status only, so never an unpaid order", () => {
  expect(orderListFilter("Pending", "")).toEqual({
    hidden: { $ne: true },
    status: "Pending",
  });
});

test("'Hidden' shows hidden orders whatever their status", () => {
  expect(orderListFilter("Hidden", "")).toEqual({ hidden: true });
});

test("search narrows within the chosen tab", () => {
  const filter = orderListFilter(AWAITING_PAYMENT, "smith");
  expect(filter.status).toEqual(AWAITING_PAYMENT);
  expect(filter.$or).toContainEqual({
    name: { $regex: "smith", $options: "i" },
  });
});

test("the totals use the same rule as 'All'", () => {
  expect(PAID_AND_VISIBLE).toEqual(orderListFilter("", ""));
});

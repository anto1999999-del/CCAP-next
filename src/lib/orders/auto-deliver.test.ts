import { expect, test } from "vitest";
import {
  DELIVERED_AFTER_DAYS,
  deliveryCutoff,
  dueForDeliveryFilter,
  isDueForDelivery,
  sentOnItsWayAt,
} from "./auto-deliver";
import { MANUAL_STATUSES, ORDER_STATUSES } from "./types";

/**
 * "On Their Way" becomes "Delivered" four days later (W-006, 24 Nov 2026).
 */

const HOUR = 60 * 60 * 1000;
const sent = new Date("2026-11-20T09:00:00+11:00");
const after = (hours: number) => new Date(sent.getTime() + hours * HOUR);
const onItsWay = { status: "On Their Way", onTheWayAt: sent };

test("an order on its way is not delivered before four days", () => {
  expect(isDueForDelivery(onItsWay, after(0))).toBe(false);
  expect(isDueForDelivery(onItsWay, after(24 * 3))).toBe(false);
  expect(isDueForDelivery(onItsWay, after(24 * 4 - 1))).toBe(false);
});

test("an order on its way is delivered once four days have passed", () => {
  expect(DELIVERED_AFTER_DAYS).toBe(4);
  expect(isDueForDelivery(onItsWay, after(24 * 4))).toBe(true);
  expect(isDueForDelivery(onItsWay, after(24 * 10))).toBe(true);
});

test("only orders on their way move, and never hidden ones", () => {
  const late = after(24 * 30);
  for (const status of [
    "Pending",
    "Processing",
    "Delivered",
    "Awaiting payment",
  ]) {
    expect(isDueForDelivery({ status, onTheWayAt: sent }, late)).toBe(false);
  }
  expect(isDueForDelivery({ ...onItsWay, hidden: true }, late)).toBe(false);
});

test("an order from before the rule counts from its last status change", () => {
  const legacy = { status: "On Their Way", updatedAt: sent };
  expect(sentOnItsWayAt(legacy)).toEqual({ at: sent, legacy: true });
  expect(isDueForDelivery(legacy, after(24 * 4))).toBe(true);
  expect(isDueForDelivery(legacy, after(24 * 2))).toBe(false);
  expect(sentOnItsWayAt(onItsWay)).toEqual({ at: sent, legacy: false });
});

test("the database filter asks for the same orders as the rule", () => {
  const now = after(24 * 4);
  expect(dueForDeliveryFilter(now)).toEqual({
    status: "On Their Way",
    hidden: { $ne: true },
    $or: [
      { onTheWayAt: { $lte: deliveryCutoff(now) } },
      {
        onTheWayAt: { $exists: false },
        updatedAt: { $lte: deliveryCutoff(now) },
      },
    ],
  });
  expect(deliveryCutoff(now)).toEqual(sent);
});

test("'Delivered' is no longer a choice in the back office", () => {
  expect(MANUAL_STATUSES).not.toContain("Delivered");
  expect(ORDER_STATUSES).toContain("Delivered");
});

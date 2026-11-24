/**
 * "On Their Way" becomes "Delivered" by itself, four days later.
 *
 * Asked for by Anto and the team (24 Nov 2026): every shipped order should end
 * as Delivered without somebody remembering to click it, so the manual
 * "Delivered" choice is gone from the back office and this rule replaces it.
 *
 * The rules are pure functions here so they can be checked without a database
 * or a clock; `deliver-sweep.ts` applies them to the live orders.
 */

export const DELIVERED_AFTER_DAYS = 4;

const DAY_MS = 24 * 60 * 60 * 1000;

/** The moment before which an order sent on its way is now due as delivered. */
export function deliveryCutoff(now: Date): Date {
  return new Date(now.getTime() - DELIVERED_AFTER_DAYS * DAY_MS);
}

/**
 * When the order was sent on its way, as far as the record shows.
 *
 * Orders moved to "On Their Way" before this rule carry no `onTheWayAt`. Their
 * `updatedAt` is the last status change (nothing else writes it), so it stands
 * in; `legacy` says so, because those orders change without an email: telling
 * a customer weeks later that their parts arrived would read as a mistake.
 */
export function sentOnItsWayAt(order: {
  onTheWayAt?: Date | null;
  updatedAt?: Date | null;
}): { at: Date; legacy: boolean } | null {
  if (order.onTheWayAt) return { at: order.onTheWayAt, legacy: false };
  if (order.updatedAt) return { at: order.updatedAt, legacy: true };
  return null;
}

/** Whether an order is due to become "Delivered" now. */
export function isDueForDelivery(
  order: {
    status?: string;
    hidden?: boolean;
    onTheWayAt?: Date | null;
    updatedAt?: Date | null;
  },
  now: Date,
): boolean {
  if (order.status !== "On Their Way" || order.hidden === true) return false;
  const sent = sentOnItsWayAt(order);
  return sent !== null && sent.at.getTime() <= deliveryCutoff(now).getTime();
}

/**
 * The same rule as a database filter, so the sweep reads only due orders.
 * Kept beside `isDueForDelivery` and checked against it in the tests.
 */
export function dueForDeliveryFilter(now: Date): Record<string, unknown> {
  const cutoff = deliveryCutoff(now);
  return {
    status: "On Their Way",
    hidden: { $ne: true },
    $or: [
      { onTheWayAt: { $lte: cutoff } },
      { onTheWayAt: { $exists: false }, updatedAt: { $lte: cutoff } },
    ],
  };
}

/** One step in an order's history, as the back office shows it. */
export type StatusChange = {
  status: string;
  at: Date;
  /** "admin" for a change made in the back office, "auto" for this rule. */
  by: "admin" | "auto";
};

/** Whether the sweep is switched on for this server. */
export function autoDeliverEnabled(): boolean {
  return process.env.ORDER_AUTO_DELIVER?.trim() === "true";
}

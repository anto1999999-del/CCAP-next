import { findPart } from "../parts/query";
import { toCents } from "../parts/price";
import type { CatalogPart } from "../parts/types";

/**
 * What an order costs.
 *
 * The only thing taken from the browser is which parts, and how many. Every
 * price is looked up here, from the catalogue, on the server.
 *
 * That is not a stylistic preference. The current site works out the total in
 * the browser and posts it to the payment endpoint, which passes it to Stripe
 * unchanged: anyone who can edit a request can buy a $3,300 engine for fifty
 * cents. Nothing in this file reads a price, a subtotal or a total from its
 * input, and nothing above it should either.
 */

/** More of one part than the yard is likely to hold, and Stripe's sanity limit. */
const MAX_QUANTITY = 20;

/** What a customer asks for. Note there is no price in here. */
export type RequestedLine = {
  urgId: string;
  invNumber: string;
  quantity: number;
};

export type PricedLine = {
  part: CatalogPart;
  quantity: number;
  unitCents: number;
  lineCents: number;
};

/** A line that cannot be sold, and the reason, in words a customer can act on. */
export type LineProblem = {
  urgId: string;
  invNumber: string;
  reason: "sold" | "not-priced";
  message: string;
};

export type PricedOrder = {
  lines: PricedLine[];
  problems: LineProblem[];
  subtotalCents: number;
};

function clampQuantity(quantity: number): number {
  const whole = Math.trunc(Number(quantity));
  if (!Number.isFinite(whole) || whole < 1) return 1;
  return Math.min(MAX_QUANTITY, whole);
}

export function priceOrder(
  catalog: readonly CatalogPart[],
  requested: readonly RequestedLine[],
): PricedOrder {
  const lines: PricedLine[] = [];
  const problems: LineProblem[] = [];

  for (const request of requested) {
    const part = findPart(catalog, request.urgId, request.invNumber);

    if (!part) {
      // Stock moves daily and the catalogue is synced, so this is ordinary.
      problems.push({
        urgId: request.urgId,
        invNumber: request.invNumber,
        reason: "sold",
        message: "This part is no longer available and has been removed.",
      });
      continue;
    }

    const unitCents = toCents(part.price);
    if (unitCents === null) {
      problems.push({
        urgId: request.urgId,
        invNumber: request.invNumber,
        reason: "not-priced",
        message: `${part.itemName ?? "This part"} is not priced online. Call us and we will price it.`,
      });
      continue;
    }

    const quantity = clampQuantity(request.quantity);
    lines.push({
      part,
      quantity,
      unitCents,
      lineCents: unitCents * quantity,
    });
  }

  return {
    lines,
    problems,
    subtotalCents: lines.reduce((total, line) => total + line.lineCents, 0),
  };
}

export type OrderTotal = {
  subtotalCents: number;
  freightCents: number;
  totalCents: number;
};

/** Parts plus freight. Both already whole cents, so this is addition. */
export function orderTotal(
  order: PricedOrder,
  freightCents: number,
): OrderTotal {
  const freight = Math.max(0, Math.round(freightCents));
  return {
    subtotalCents: order.subtotalCents,
    freightCents: freight,
    totalCents: order.subtotalCents + freight,
  };
}

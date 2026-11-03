"use server";

import { z } from "zod";
import { loadCatalog } from "@/lib/parts/catalog";
import { formatCents } from "@/lib/parts/price";
import { orderTotal, priceOrder, type PricedLine } from "@/lib/orders/pricing";
import { quoteFreight, type ShipmentItem } from "@/lib/shipping/carrier";
import { shippingProfileFor, volumeM3 } from "@/lib/shipping/dimensions";
import { rateLimit } from "@/lib/rate-limit";
import type { LineProblem } from "@/lib/orders/pricing";

/**
 * Work out what an order costs, and where the cost comes from.
 *
 * Called from the checkout as the customer fills in their address. The browser
 * sends which parts and how many; its own idea of the total is never consulted.
 * Prices come from the catalogue and freight from the carrier, both here.
 *
 * Freight is quoted once, for the whole consignment. It used to be quoted per
 * part as well, to show what each would cost to send alone. Those figures came
 * off the checkout in the November 2026 redesign, and every one was a separate
 * call to a paid service that also made the customer wait.
 */

/** Only the identifiers. Deliberately no price, and no total. */
const LineSchema = z.object({
  urgId: z.string().min(1).max(40),
  invNumber: z.string().min(1).max(40),
  quantity: z.number().int().min(1).max(20),
});

const QuoteSchema = z.object({
  lines: z.array(LineSchema).min(1).max(50),
  /** Collecting from the yard skips freight entirely. */
  pickup: z.boolean(),
  suburb: z.string().trim().max(80).default(""),
  postcode: z.string().trim().max(10).default(""),
});

/** One part that can be bought, at the catalogue's price. */
export type QuotedLine = {
  urgId: string;
  invNumber: string;
  parts: string;
};

export type CheckoutQuote =
  | {
      ok: true;
      lines: QuotedLine[];
      subtotal: string;
      freight: string;
      total: string;
      totalCents: number;
      /** Parts that could not be priced, so the page can say which and why. */
      problems: LineProblem[];
      /** True when freight was asked for but the carrier could not answer. */
      freightUnavailable: boolean;
      /** True when a part in the order has never been weighed and measured. */
      freightEstimated: boolean;
    }
  | { ok: false; message: string };

function shipmentItem(line: PricedLine): ShipmentItem {
  const { profile } = shippingProfileFor(line.part);
  return {
    quantity: line.quantity,
    weightKg: profile.weightKg,
    lengthCm: profile.lengthCm,
    widthCm: profile.widthCm,
    heightCm: profile.heightCm,
    volumeM3: volumeM3(profile),
  };
}

export async function quoteCheckout(
  input: z.input<typeof QuoteSchema>,
): Promise<CheckoutQuote> {
  const parsed = QuoteSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "That order could not be read. Please reload the page.",
    };
  }

  const { lines, pickup, suburb, postcode } = parsed.data;

  // The carrier is a paid service and this runs as the customer types.
  const limit = rateLimit(`checkout:${suburb}:${postcode}`, {
    limit: 30,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.allowed) {
    return {
      ok: false,
      message:
        "Too many quotes in a short time. Please wait a moment and try again.",
    };
  }

  const { parts } = await loadCatalog();
  const order = priceOrder(parts, lines);

  if (order.lines.length === 0) {
    return {
      ok: false,
      message:
        order.problems[0]?.message ??
        "Nothing in this order can be bought online just now.",
    };
  }

  const destination = { suburb, postcode };
  const quotable = !pickup && suburb !== "" && postcode !== "";

  const whole = quotable
    ? await quoteFreight({
        destination,
        items: order.lines.map(shipmentItem),
      }).catch((error) => {
        console.error(
          `[checkout] freight quote failed for ${suburb} ${postcode}:`,
          error instanceof Error ? error.message : error,
        );
        return null;
      })
    : null;

  /*
    A failed carrier call and a genuine zero are not the same thing, and the
    difference matters: falling back to zero and then formatting it printed
    "Delivery $0.00" and a confident total on an address nobody could price.
  */
  const freightUnpriced = quotable && whole === null;
  const freightCents = whole?.totalCents ?? 0;
  const totals = orderTotal(order, freightCents);

  return {
    ok: true,
    lines: order.lines.map((line) => ({
      urgId: String(line.part.urgId),
      invNumber: String(line.part.invNumber),
      parts: formatCents(line.lineCents),
    })),
    subtotal: formatCents(totals.subtotalCents),
    freight: pickup
      ? "Pickup"
      : freightUnpriced
        ? "Call us for a price"
        : formatCents(totals.freightCents),
    // Parts only while the freight is unknown, and the page says so rather
    // than presenting it as the amount due.
    total: freightUnpriced
      ? formatCents(totals.subtotalCents)
      : formatCents(totals.totalCents),
    totalCents: totals.totalCents,
    problems: order.problems,
    freightUnavailable: freightUnpriced,
    freightEstimated:
      !pickup &&
      order.lines.some((line) => !shippingProfileFor(line.part).measured),
  };
}

"use server";

import { z } from "zod";
import { loadCatalog } from "@/lib/parts/catalog";
import { formatCents } from "@/lib/parts/price";
import { orderTotal, priceOrder } from "@/lib/orders/pricing";
import { quoteFreight } from "@/lib/shipping/carrier";
import { shippingProfileFor, volumeM3 } from "@/lib/shipping/dimensions";
import { rateLimit } from "@/lib/rate-limit";
import type { LineProblem } from "@/lib/orders/pricing";

/**
 * Work out what an order actually costs.
 *
 * Called from the checkout as the customer fills in their address, and again
 * before payment. The browser sends which parts and how many, and its own idea
 * of the total is never consulted: prices come from the catalogue and freight
 * from the carrier, both here on the server.
 *
 * The figures this returns are the figures the payment will be created from, so
 * a customer sees the number they will be charged.
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

export type CheckoutQuote =
  | {
      ok: true;
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

export async function quoteCheckout(
  input: z.input<typeof QuoteSchema>,
): Promise<CheckoutQuote> {
  const parsed = QuoteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "That order could not be read. Please reload the page." };
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
      message: "Too many quotes in a short time. Please wait a moment and try again.",
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

  let freightCents = 0;
  let freightUnavailable = false;

  /*
    About one part in seven has never been measured. Its freight is quoted from
    a deliberately generous assumption, and the customer is told so rather than
    being given a firm number the yard may have to correct.
  */
  const freightEstimated = order.lines.some(
    (line) => !shippingProfileFor(line.part).measured,
  );

  if (!pickup && suburb && postcode) {
    try {
      const quote = await quoteFreight({
        destination: { suburb, postcode },
        items: order.lines.map((line) => {
          const { profile } = shippingProfileFor(line.part);
          return {
            quantity: line.quantity,
            weightKg: profile.weightKg,
            lengthCm: profile.lengthCm,
            widthCm: profile.widthCm,
            heightCm: profile.heightCm,
            volumeM3: volumeM3(profile),
          };
        }),
      });
      freightCents = quote.totalCents;
      freightUnavailable = quote.totalCents === 0;
    } catch (error) {
      // The carrier being down must not stop somebody ordering: the yard can
      // quote freight by hand, and does for bulky items anyway. It is logged
      // rather than swallowed, because "we could not price the freight" looks
      // the same to a customer whether the carrier is down or we sent it
      // something it could not read.
      console.error(
        `[checkout] freight quote failed for ${suburb} ${postcode}:`,
        error instanceof Error ? error.message : error,
      );
      freightUnavailable = true;
    }
  }

  const totals = orderTotal(order, freightCents);

  return {
    ok: true,
    subtotal: formatCents(totals.subtotalCents),
    freight: pickup ? "Pickup" : formatCents(totals.freightCents),
    total: formatCents(totals.totalCents),
    totalCents: totals.totalCents,
    problems: order.problems,
    freightUnavailable: !pickup && freightUnavailable,
    freightEstimated: !pickup && freightEstimated,
  };
}

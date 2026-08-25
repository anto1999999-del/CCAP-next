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
 * The freight is broken down per part, because "delivery $63" on an order of
 * three parts says nothing about which one is expensive to send. Each part is
 * quoted on its own as well as the consignment being quoted whole, and the two
 * do not add up: a carrier prices a consignment as one thing, so three parts
 * together cost less than three separate shipments. The per-part figure answers
 * "what does this one cost to send", which is the question worth asking when
 * deciding what to stock and how to price it.
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

/** How the cost of one line is made up. */
export type QuotedLine = {
  name: string;
  quantity: number;
  /** What the parts on this line cost. */
  parts: string;
  /** Total for the line, so two of a part reads as twice the weight. */
  weightKg: number;
  dimensions: string;
  /** False when nobody has measured this part and its size is assumed. */
  measured: boolean;
  /** What this line alone would cost to send, or null if it was not priced. */
  freightAlone: string | null;
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

/**
 * Above this many lines, only the consignment is priced.
 *
 * Every per-part figure is another call to a paid service, and the breakdown
 * stops being readable well before it stops being affordable.
 */
const MAX_LINES_TO_ITEMISE = 6;

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
  const itemise = quotable && order.lines.length <= MAX_LINES_TO_ITEMISE;

  /*
    The consignment and each part within it, asked for at once. They are
    independent questions, so asking them one after another would take as long
    as the whole chain rather than as long as the slowest single answer.
  */
  const [whole, ...alone] = await Promise.all([
    quotable
      ? quoteFreight({
          destination,
          items: order.lines.map(shipmentItem),
        }).catch((error) => {
          console.error(
            `[checkout] freight quote failed for ${suburb} ${postcode}:`,
            error instanceof Error ? error.message : error,
          );
          return null;
        })
      : Promise.resolve(null),
    ...order.lines.map((line) =>
      itemise
        ? quoteFreight({ destination, items: [shipmentItem(line)] })
            .then((quote) => quote.totalCents)
            // A missing per-part figure is a gap in an explanation, not a
            // failure. What the customer pays is the consignment price.
            .catch(() => null)
        : Promise.resolve(null),
    ),
  ]);

  const freightCents = whole?.totalCents ?? 0;
  const totals = orderTotal(order, freightCents);

  const quotedLines: QuotedLine[] = order.lines.map((line, index) => {
    const { profile, measured } = shippingProfileFor(line.part);
    const separate = alone[index];

    return {
      name: line.part.itemName ?? "Used part",
      quantity: line.quantity,
      parts: formatCents(line.lineCents),
      weightKg: profile.weightKg * line.quantity,
      dimensions: `${profile.lengthCm} x ${profile.widthCm} x ${profile.heightCm} cm`,
      measured,
      freightAlone: separate === null ? null : formatCents(separate),
    };
  });

  return {
    ok: true,
    lines: quotedLines,
    subtotal: formatCents(totals.subtotalCents),
    freight: pickup ? "Pickup" : formatCents(totals.freightCents),
    total: formatCents(totals.totalCents),
    totalCents: totals.totalCents,
    problems: order.problems,
    freightUnavailable: quotable && freightCents === 0,
    freightEstimated: !pickup && quotedLines.some((line) => !line.measured),
  };
}

"use server";

import { z } from "zod";
import { currentAccount } from "@/lib/auth/accounts";
import { loadCatalog } from "@/lib/parts/catalog";
import { thumbnailUrl } from "@/lib/parts/images";
import { orderTotal, priceOrder } from "@/lib/orders/pricing";
import { createPending } from "@/lib/orders/repository";
import { isPaymentConfigured, payments } from "@/lib/payments/stripe";
import { quoteFreight } from "@/lib/shipping/carrier";
import { shippingProfileFor, volumeM3 } from "@/lib/shipping/dimensions";
import { rateLimit } from "@/lib/rate-limit";
import { isConfigured } from "@/lib/db/mongo";

/**
 * Start a payment.
 *
 * This is the step the current site gets wrong twice over. There, the browser
 * works out the total and asks for a payment of that amount, and afterwards
 * posts the order itself. So the price is whatever the browser says, and an
 * order can be recorded that was never paid for.
 *
 * Here the browser sends which parts, how many, and where to. Everything else
 * is worked out on the server: the prices come from the catalogue, the freight
 * from the carrier, and the payment is created for that total. The order is
 * written before the payment as "Awaiting payment" and only becomes a real
 * order when Stripe tells us, with a signature, that the money arrived.
 */

const LineSchema = z.object({
  urgId: z.string().min(1).max(40),
  invNumber: z.string().min(1).max(40),
  quantity: z.number().int().min(1).max(20),
});

const CheckoutSchema = z.object({
  lines: z.array(LineSchema).min(1).max(50),
  pickup: z.boolean(),
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(6).max(40),
  address: z.string().trim().min(4).max(160),
  suburb: z.string().trim().min(2).max(80),
  postcode: z.string().trim().regex(/^\d{3,4}$/, "Enter a valid postcode."),
});

export type StartPayment =
  | { ok: true; clientSecret: string; orderId: string; totalCents: number }
  | { ok: false; message: string };

/** Stripe will not take less than this, and nothing the yard sells is near it. */
const MINIMUM_CENTS = 50;

export async function startPayment(
  input: z.input<typeof CheckoutSchema>,
): Promise<StartPayment> {
  if (!isPaymentConfigured() || !isConfigured()) {
    return {
      ok: false,
      message: "Card payment is not switched on. Please call the yard to pay.",
    };
  }

  const parsed = CheckoutSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please check your delivery details and try again.",
    };
  }

  const details = parsed.data;

  const limit = rateLimit(`payment:${details.email.toLowerCase()}`, {
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.allowed) {
    return { ok: false, message: "Too many attempts. Please try again shortly." };
  }

  const { parts } = await loadCatalog();
  const order = priceOrder(parts, details.lines);

  if (order.lines.length === 0) {
    return {
      ok: false,
      message:
        order.problems[0]?.message ??
        "Nothing in this order can be bought online just now.",
    };
  }

  let freightCents = 0;
  if (!details.pickup) {
    try {
      freightCents = (
        await quoteFreight({
          destination: {
            suburb: details.suburb,
            postcode: details.postcode,
          },
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
        })
      ).totalCents;
    } catch (error) {
      console.error("[payment] freight quote failed:", error);
      /*
        Deliberately refuses rather than charging for the parts alone. Taking
        payment without freight on it leaves the yard to either absorb the cost
        or ring the customer for more money after they have paid.
      */
      return {
        ok: false,
        message:
          "We could not price the freight for that address just now. Please call the yard and we will quote it for you.",
      };
    }
  }

  const totals = orderTotal(order, freightCents);
  if (totals.totalCents < MINIMUM_CENTS) {
    return { ok: false, message: "That order is too small to pay for online." };
  }

  const account = await currentAccount();

  const intent = await payments().paymentIntents.create({
    amount: totals.totalCents,
    currency: "aud",
    automatic_payment_methods: { enabled: true },
    receipt_email: details.email,
    description: `Central Coast Auto Parts, ${order.lines.length} ${order.lines.length === 1 ? "part" : "parts"}`,
    metadata: {
      customerEmail: details.email,
      pickup: String(details.pickup),
      partsCents: String(totals.subtotalCents),
      freightCents: String(totals.freightCents),
    },
  });

  if (!intent.client_secret) {
    return {
      ok: false,
      message: "The payment could not be started. Please try again.",
    };
  }

  const orderId = await createPending({
    userId: account?.id ?? null,
    items: order.lines.map((line) => ({
      name: line.part.itemName ?? "Used part",
      price: line.unitCents / 100,
      quantity: line.quantity,
      image: thumbnailUrl(line.part),
      urgId: String(line.part.urgId),
      invNumber: String(line.part.invNumber),
      stockNo: line.part.stockNo ?? undefined,
      manufacturer: line.part.manufacturer ?? undefined,
      model: line.part.model ?? undefined,
      productUrl: `/product/${line.part.urgId}/${line.part.invNumber}`,
    })),
    amountCents: totals.totalCents,
    customer: {
      name: details.name,
      email: details.email,
      phone: details.phone,
      address: details.address,
      city: details.suburb,
      zipcode: details.postcode,
    },
    pickup: details.pickup,
    paymentIntentId: intent.id,
  });

  return {
    ok: true,
    clientSecret: intent.client_secret,
    orderId,
    totalCents: totals.totalCents,
  };
}

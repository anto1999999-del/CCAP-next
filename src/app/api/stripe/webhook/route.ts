import type { NextRequest } from "next/server";
import { payments } from "@/lib/payments/stripe";
import { findByPayment, markPaid } from "@/lib/orders/repository";
import { sendEmail } from "@/lib/email";
import { orderConfirmation, orderForSales } from "@/lib/emails/orders";
import { site } from "@/lib/site";

/**
 * Stripe telling us what happened to a payment.
 *
 * This is the only thing that turns an order from "Awaiting payment" into a
 * real one. The browser is never believed about whether money arrived: it can
 * be closed mid-payment, it can lie, and on the current site it is the only
 * thing that decides, which is why an order there can exist without a payment
 * behind it.
 *
 * The signature is checked against the raw body before anything is read out of
 * it. Without that check this endpoint is a public form for marking any order
 * paid.
 */

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error(
      "[stripe] STRIPE_WEBHOOK_SECRET is not set; ignoring webhook.",
    );
    return new Response("Webhook not configured", { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  // The raw text, not the parsed body: the signature covers the exact bytes.
  const body = await request.text();

  let event;
  try {
    event = payments().webhooks.constructEvent(body, signature, secret);
  } catch (error) {
    console.error(
      "[stripe] webhook signature rejected:",
      error instanceof Error ? error.message : error,
    );
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    if (event.type === "payment_intent.succeeded") {
      await onPaid(event.data.object.id);
    }
  } catch (error) {
    /*
      A 500 tells Stripe to retry, which is what we want if the database was
      briefly unavailable: the order is still sitting there awaiting payment.
    */
    console.error(`[stripe] handling ${event.type} failed:`, error);
    return new Response("Handler failed", { status: 500 });
  }

  return Response.json({ received: true });
}

async function onPaid(paymentIntentId: string): Promise<void> {
  // False when this payment has already been handled: Stripe retries anything
  // it did not get a clean answer to, and an order must not be paid twice.
  const changed = await markPaid(paymentIntentId);
  if (!changed) return;

  const order = await findByPayment(paymentIntentId);
  if (!order) return;

  const sales = orderForSales(order);
  const customer = orderConfirmation(order);

  await Promise.all([
    sendEmail({ to: site.contact.email, ...sales }),
    /*
      Replies go to sales rather than to the unmonitored sender. Somebody who
      hits reply on their confirmation to change an address is writing to a
      human either way.
    */
    sendEmail({
      to: order.customer.email,
      replyTo: site.contact.email,
      ...customer,
    }),
  ]);
}

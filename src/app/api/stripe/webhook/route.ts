import type { NextRequest } from "next/server";
import { payments } from "@/lib/payments/stripe";
import {
  emailsOwed,
  findByPayment,
  markEmailSent,
  markPaid,
} from "@/lib/orders/repository";
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
      briefly unavailable or an email could not be sent: the next delivery
      picks up whatever is still undone.
    */
    console.error(`[stripe] handling ${event.type} failed:`, error);
    return new Response("Handler failed", { status: 500 });
  }

  return Response.json({ received: true });
}

async function onPaid(paymentIntentId: string): Promise<void> {
  /*
    Idempotent: false when this payment was already handled. That no longer
    ends the job, because a delivery can also be Stripe retrying an event whose
    emails did not all go out; whatever is still owed is sent below either way.
  */
  await markPaid(paymentIntentId);

  const owed = await emailsOwed(paymentIntentId);
  if (owed.length === 0) return;

  const order = await findByPayment(paymentIntentId);
  if (!order) return;

  const messages = {
    sales: { to: site.contact.email, ...orderForSales(order) },
    /*
      Replies go to sales rather than to the unmonitored sender. Somebody who
      hits reply on their confirmation to change an address is writing to a
      human either way.
    */
    customer: {
      to: order.customer.email,
      replyTo: site.contact.email,
      ...orderConfirmation(order),
    },
  };

  const results = await Promise.all(
    owed.map(async (which) => {
      const sent = await sendEmail({
        ...messages[which],
        // Two overlapping deliveries of the same event send one email, not two.
        idempotencyKey: `order-${order.id}-${which}`,
      });
      if (sent.ok) await markEmailSent(paymentIntentId, which);
      return sent.ok ? null : which;
    }),
  );

  const failed = results.filter(Boolean);
  if (failed.length > 0) {
    /*
      Thrown so the handler answers 500 and Stripe delivers the event again,
      which it keeps doing for up to three days. The order is already paid and
      the emails that did go out are ticked off, so the retry sends only these.
    */
    throw new Error(
      `order ${order.id}: ${failed.join(" and ")} email not sent, asking Stripe to retry`,
    );
  }
}

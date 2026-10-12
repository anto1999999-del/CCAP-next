import type { NextRequest } from "next/server";
import { payments } from "@/lib/payments/stripe";
import {
  emailsOwed,
  findByPayment,
  markEmailSent,
  markPaid,
  recordSupplierOrder,
  supplierOrderState,
} from "@/lib/orders/repository";
import { sendEmail } from "@/lib/email";
import { orderConfirmation, orderForSales } from "@/lib/emails/orders";
import { site } from "@/lib/site";
import { pinnacleConfig, sendToPinnacle } from "@/lib/supplier/pinnacle-client";
import { buildPinnacleOrder } from "@/lib/supplier/pinnacle-order";
import type { Order } from "@/lib/orders/types";

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
      briefly unavailable, an email could not be sent or the yard's system did
      not answer: the next delivery picks up whatever is still undone.
    */
    console.error(`[stripe] handling ${event.type} failed:`, error);
    return new Response("Handler failed", { status: 500 });
  }

  return Response.json({ received: true });
}

async function onPaid(paymentIntentId: string): Promise<void> {
  /*
    Idempotent: false when this payment was already handled. That does not end
    the job, because a delivery can also be Stripe retrying an event whose
    emails did not all go out or whose order never reached the yard; whatever
    is still owed is done below either way.
  */
  await markPaid(paymentIntentId, {
    sendToSupplier: pinnacleConfig() !== null,
  });

  const order = await findByPayment(paymentIntentId);
  if (!order) return;

  // Side by side, so a slow reply from one does not eat the other's time
  // inside the few seconds Stripe waits for an answer.
  const [unsentEmails, supplierOwed] = await Promise.all([
    sendOwedEmails(order, paymentIntentId),
    sendToSupplier(order, paymentIntentId),
  ]);

  const undone = [
    ...unsentEmails.map((which) => `${which} email not sent`),
    ...(supplierOwed ? ["not yet in Pinnacle"] : []),
  ];
  if (undone.length > 0) {
    /*
      Thrown so the handler answers 500 and Stripe delivers the event again,
      which it keeps doing for up to three days. The order is already paid and
      everything that did succeed is ticked off, so the retry does only this.
    */
    throw new Error(
      `order ${order.id}: ${undone.join(", ")}; asking Stripe to retry`,
    );
  }
}

/** Sends whichever payment emails are still owed. Returns those that failed. */
async function sendOwedEmails(
  order: Order,
  paymentIntentId: string,
): Promise<string[]> {
  const owed = await emailsOwed(paymentIntentId);
  if (owed.length === 0) return [];

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

  return results.filter((which): which is NonNullable<typeof which> =>
    Boolean(which),
  );
}

/**
 * Sends without a usable answer before giving up and telling a person.
 * Stripe's retries run for three days; an order the yard has to pick should
 * not wait that long to be noticed.
 */
const SUPPLIER_ATTEMPTS = 5;

/**
 * Puts a paid order into the yard's Pinnacle Pro.
 *
 * Returns true when it is still owed and worth another try. Never throws: an
 * order that cannot go in is not a reason to tell the customer nothing, so a
 * failure here is recorded on the order and emailed to sales instead.
 */
async function sendToSupplier(
  order: Order,
  paymentIntentId: string,
): Promise<boolean> {
  const state = await supplierOrderState(paymentIntentId);
  // Not owed: paid before this was switched on, already in, or given up on.
  if (state?.state !== "pending") return false;

  // Switched off since the order was paid. Left pending, not retried.
  const config = pinnacleConfig();
  if (!config) return false;

  const fail = async (attempts: number, message: string) => {
    await recordSupplierOrder(paymentIntentId, {
      state: "failed",
      attempts,
      message,
    });
    console.error(`[pinnacle] order ${order.id} not sent: ${message}`);
    await sendEmail({
      to: site.contact.email,
      subject: `Order ${order.id.slice(-6).toUpperCase()} did NOT go into Pinnacle, please enter it by hand`,
      text: [
        `The website order from ${order.customer.name} was paid, but it could not be sent to Pinnacle Pro automatically.`,
        "",
        `Reason: ${message}`,
        "",
        "Please enter this order in Pinnacle by hand. The order details are in the order email and in the website's order list.",
        `Website order id: ${order.id}`,
      ].join("\n"),
      idempotencyKey: `order-${order.id}-pinnacle-failed`,
    });
  };

  try {
    const built = buildPinnacleOrder(order, {
      ...config.settings,
      paymentReference: paymentIntentId,
    });
    if (!built.ok) {
      await fail(state.attempts, built.reason);
      return false;
    }

    const outcome = await sendToPinnacle(config, built.order);

    if (outcome.kind === "accepted") {
      await recordSupplierOrder(paymentIntentId, {
        state: "sent",
        attempts: state.attempts,
        message: outcome.message,
      });
      return false;
    }

    if (outcome.kind === "refused") {
      // Read and turned down: the same order gets the same answer.
      await fail(state.attempts, outcome.message);
      return false;
    }

    const attempts = state.attempts + 1;
    if (attempts >= SUPPLIER_ATTEMPTS) {
      await fail(
        attempts,
        `no answer after ${attempts} tries (${outcome.message})`,
      );
      return false;
    }

    await recordSupplierOrder(paymentIntentId, {
      state: "pending",
      attempts,
      message: outcome.message,
    });
    return true;
  } catch (error) {
    // The database or the mailer, not the supplier. Try again next delivery.
    console.error(`[pinnacle] order ${order.id}:`, error);
    return true;
  }
}

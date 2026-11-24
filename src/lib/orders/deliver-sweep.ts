import "server-only";
import { sendEmail } from "@/lib/email";
import { orderStatusUpdate } from "@/lib/emails/orders";
import { site } from "@/lib/site";
import { orders } from "../db/mongo";
import {
  autoDeliverEnabled,
  dueForDeliveryFilter,
  sentOnItsWayAt,
  type StatusChange,
} from "./auto-deliver";
import { getOrder } from "./repository";

/**
 * Move every due order from "On Their Way" to "Delivered".
 *
 * Runs once an hour inside the server (see `src/instrumentation.ts`) and again
 * whenever the back office opens the order list, so the list is never stale.
 * Off unless `ORDER_AUTO_DELIVER=true`: the local copies of this site point at
 * the live database, and a developer's machine must not deliver real orders or
 * email real customers.
 *
 * Each order is moved with a conditional update on its current status, so two
 * sweeps at once (the timer and a page load) cannot both move it, and the
 * customer is emailed once. The email is the same one the back office sends
 * for a manual "Delivered".
 */

let running: Promise<number> | null = null;

export function deliverDueOrders(now = new Date()): Promise<number> {
  if (!autoDeliverEnabled()) return Promise.resolve(0);
  // A sweep already under way is joined, not repeated.
  running ??= sweep(now).finally(() => {
    running = null;
  });
  return running;
}

async function sweep(now: Date): Promise<number> {
  const collection = await orders();
  const due = await collection.find(dueForDeliveryFilter(now)).toArray();
  let moved = 0;

  for (const document of due) {
    const change: StatusChange = { status: "Delivered", at: now, by: "auto" };
    const result = await collection.updateOne(
      { _id: document._id, status: "On Their Way" },
      {
        $set: { status: "Delivered", deliveredAt: now, updatedAt: now },
        $push: { statusHistory: change },
      },
    );
    if (result.modifiedCount !== 1) continue;
    moved += 1;

    const legacy = sentOnItsWayAt(document)?.legacy ?? true;
    if (legacy) continue;

    const order = await getOrder(document._id.toString());
    if (!order?.customer.email) continue;

    const sent = await sendEmail({
      to: order.customer.email,
      replyTo: site.contact.email,
      ...orderStatusUpdate(order),
    });
    if (!sent.ok) {
      console.error(
        `[auto-deliver] order ${order.id} marked delivered; the email to the customer failed`,
      );
    }
  }

  if (moved > 0)
    console.log(`[auto-deliver] ${moved} order(s) marked delivered`);
  return moved;
}

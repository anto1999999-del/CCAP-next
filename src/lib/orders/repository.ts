import "server-only";
import { ObjectId } from "mongodb";
import { orders, type OrderDocument } from "../db/mongo";
import type { Order, OrderStatus } from "./types";

export { ORDER_STATUSES } from "./types";
export type { Order, OrderStatus } from "./types";

/**
 * Reading and writing orders.
 *
 * The documents are the ones the current site created, so the shapes are its
 * shapes: amounts in dollars, a status string, and a `hidden` flag that keeps
 * an order in the database while leaving it out of the admin's list and totals.
 *
 * Hidden is not deleted, and nothing here deletes an order. A business record
 * of money taken is not something a web page should be able to destroy.
 */

function toOrder(document: OrderDocument): Order {
  return {
    id: document._id.toString(),
    userId: document.user?.toString() ?? "",
    placedAt: document.createdAt?.toISOString() ?? null,
    status: (document.status as OrderStatus) ?? "Pending",
    amountCents: Math.round(Number(document.amount ?? 0) * 100),
    paymentMethod: document.paymentMethod ?? "",
    pickup: document.pickup === true,
    hidden: document.hidden === true,
    customer: {
      name: document.name ?? "",
      email: document.email ?? "",
      phone: document.phone ?? "",
      address: document.address ?? "",
      city: document.city ?? "",
      zipcode: document.zipcode ?? "",
    },
    items: (document.items ?? []).map((item) => ({
      name: item.name,
      quantity: Number(item.quantity ?? 1),
      priceCents: Math.round(Number(item.price ?? 0) * 100),
      urgId: item.urgId,
      invNumber: item.invNumber,
      image: item.image,
    })),
  };
}

/** One customer's orders, newest first. */
export async function listForUser(userId: string): Promise<Order[]> {
  let id: ObjectId;
  try {
    id = new ObjectId(userId);
  } catch {
    return [];
  }

  const documents = await (await orders())
    .find({ user: id })
    .sort({ createdAt: -1 })
    .toArray();

  return documents.map(toOrder);
}

/**
 * Every order for the admin list.
 *
 * Hidden orders are left out unless asked for, which is the behaviour the
 * hidden flag exists to provide.
 */
export async function listAll({
  includeHidden = false,
  limit = 200,
}: { includeHidden?: boolean; limit?: number } = {}): Promise<Order[]> {
  const filter = includeHidden ? {} : { hidden: { $ne: true } };

  const documents = await (await orders())
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  return documents.map(toOrder);
}

export async function setStatus(
  orderId: string,
  status: OrderStatus,
): Promise<void> {
  await (await orders()).updateOne(
    { _id: new ObjectId(orderId) },
    { $set: { status, updatedAt: new Date() } },
  );
}

/** Hide or restore an order. The document itself is never removed. */
export async function setHidden(
  orderId: string,
  hidden: boolean,
): Promise<void> {
  await (await orders()).updateOne(
    { _id: new ObjectId(orderId) },
    hidden
      ? { $set: { hidden: true, hiddenAt: new Date() } }
      : { $set: { hidden: false }, $unset: { hiddenAt: "" } },
  );
}

/** What the admin dashboard counts. Hidden orders are excluded from all of it. */
export async function summarise(): Promise<{
  count: number;
  revenueCents: number;
  byStatus: Record<string, number>;
}> {
  const documents = await (await orders())
    .find({ hidden: { $ne: true } })
    .toArray();

  const byStatus: Record<string, number> = {};
  let revenueCents = 0;

  for (const document of documents) {
    const status = document.status ?? "Pending";
    byStatus[status] = (byStatus[status] ?? 0) + 1;
    revenueCents += Math.round(Number(document.amount ?? 0) * 100);
  }

  return { count: documents.length, revenueCents, byStatus };
}

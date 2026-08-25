import "server-only";
import { ObjectId } from "mongodb";
import {
  orders,
  type OrderDocument,
  type OrderItemDocument,
} from "../db/mongo";
import { NEEDS_ACTION, ORDER_STATUSES } from "./types";
import type { Order, OrderStatus, OrderSummary } from "./types";

export { ORDER_STATUSES, NEEDS_ACTION } from "./types";
export type { Order, OrderStatus, OrderSummary } from "./types";

/**
 * Reading and writing orders.
 *
 * The documents are the ones the current site created, so the shapes are its
 * shapes: amounts in dollars, a status string, and a `hidden` flag that keeps
 * an order in the database while leaving it out of the admin's list and totals.
 *
 * Hidden is not deleted, and nothing here deletes an order. A business record
 * of money taken is not something a web page should be able to destroy.
 *
 * Item detail varies with age. Orders placed since the catalogue integration
 * carry the make, model, stock number and shelf tag; the four oldest carry only
 * a name and a price. Everything reading them treats the rest as optional
 * rather than assuming the newer shape.
 */

function itemVehicle(item: OrderItemDocument): string | undefined {
  const parts = [item.year, item.manufacturer, item.model].filter(Boolean);
  return parts.length > 0 ? parts.join(" ").toUpperCase() : undefined;
}

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
      stockNo: item.stockNo,
      tag: item.tag,
      manufacturer: item.manufacturer,
      model: item.model,
      year: item.year == null ? undefined : String(item.year),
      itemTypeCode: item.itemTypeCode,
      image: item.image,
      vehicle: itemVehicle(item),
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

export type OrderQuery = {
  /** Free text over the part, the customer, their phone, address or order id. */
  search?: string;
  /** One of the four statuses, "Hidden", or nothing for everything visible. */
  status?: string;
  sort?: "newest" | "oldest";
  page?: number;
  perPage?: number;
};

export type OrderPage = {
  orders: Order[];
  page: number;
  pageCount: number;
  total: number;
  from: number;
  to: number;
};

/**
 * The admin's list.
 *
 * Hidden orders are excluded unless they are what was asked for. Search runs
 * over the fields somebody actually has to hand when a customer rings: a part
 * name, their name, a phone number, or an order id read off an email.
 */
export async function listOrders({
  search = "",
  status = "",
  sort = "newest",
  page = 1,
  perPage = 20,
}: OrderQuery = {}): Promise<OrderPage> {
  const collection = await orders();

  const filter: Record<string, unknown> =
    status === "Hidden" ? { hidden: true } : { hidden: { $ne: true } };

  if (status && status !== "Hidden") filter.status = status;

  const term = search.trim();
  if (term) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const like = { $regex: escaped, $options: "i" };
    const matches: unknown[] = [
      { name: like },
      { email: like },
      { phone: like },
      { address: like },
      { city: like },
      { "items.name": like },
      { "items.stockNo": like },
      { "items.manufacturer": like },
      { "items.model": like },
    ];

    // An id is only meaningful whole, so a complete one is matched as well.
    if (/^[a-f\d]{24}$/i.test(term)) matches.push({ _id: new ObjectId(term) });

    filter.$or = matches;
  }

  const total = await collection.countDocuments(filter);
  const size = Math.min(100, Math.max(1, perPage));
  const pageCount = Math.max(1, Math.ceil(total / size));
  const safePage = Math.min(Math.max(1, page), pageCount);

  const documents = await collection
    .find(filter)
    .sort({ createdAt: sort === "oldest" ? 1 : -1 })
    .skip((safePage - 1) * size)
    .limit(size)
    .toArray();

  return {
    orders: documents.map(toOrder),
    page: safePage,
    pageCount,
    total,
    from: total === 0 ? 0 : (safePage - 1) * size + 1,
    to: Math.min(safePage * size, total),
  };
}

/** How many orders sit behind each filter, including the hidden ones. */
export async function countByStatus(): Promise<Record<string, number>> {
  const collection = await orders();

  const [visible, hidden] = await Promise.all([
    collection
      .aggregate<{ _id: string; n: number }>([
        { $match: { hidden: { $ne: true } } },
        { $group: { _id: "$status", n: { $sum: 1 } } },
      ])
      .toArray(),
    collection.countDocuments({ hidden: true }),
  ]);

  const counts: Record<string, number> = { All: 0, Hidden: hidden };
  for (const status of ORDER_STATUSES) counts[status] = 0;

  for (const row of visible) {
    counts[row._id ?? "Pending"] = row.n;
    counts.All += row.n;
  }

  return counts;
}

export async function getOrder(orderId: string): Promise<Order | null> {
  let id: ObjectId;
  try {
    id = new ObjectId(orderId);
  } catch {
    return null;
  }

  const document = await (await orders()).findOne({ _id: id });
  return document ? toOrder(document) : null;
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

/**
 * Everything the dashboard shows, worked out in one pass.
 *
 * Thirty-five orders is nothing to a database, so this reads them and counts
 * here rather than running six aggregations. If the yard ever has fifty
 * thousand, this is the function to push into the database, and the shape it
 * returns will not have to change.
 */
export async function summarise(): Promise<OrderSummary> {
  const documents = await (await orders())
    .find({ hidden: { $ne: true } })
    .toArray();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const countByStatus: Record<string, number> = {};
  const revenueByStatusCents: Record<string, number> = {};
  const monthlyRevenueCents = Array<number>(12).fill(0);
  const perDayCounts = new Map<string, number>();

  let todayCount = 0;
  let todayRevenueCents = 0;
  let revenueCents = 0;
  let needsAction = 0;

  const thisYear = new Date().getFullYear();

  for (const document of documents) {
    const status = document.status ?? "Pending";
    const cents = Math.round(Number(document.amount ?? 0) * 100);
    const placed = document.createdAt;

    countByStatus[status] = (countByStatus[status] ?? 0) + 1;
    revenueByStatusCents[status] = (revenueByStatusCents[status] ?? 0) + cents;
    revenueCents += cents;

    if (NEEDS_ACTION.includes(status as OrderStatus)) needsAction += 1;

    if (placed) {
      if (placed >= startOfToday) {
        todayCount += 1;
        todayRevenueCents += cents;
      }
      if (placed.getFullYear() === thisYear) {
        monthlyRevenueCents[placed.getMonth()] += cents;
      }

      const day = placed.toISOString().slice(0, 10);
      perDayCounts.set(day, (perDayCounts.get(day) ?? 0) + 1);
    }
  }

  const perDay = [...perDayCounts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30)
    .map(([date, count]) => ({ date, count }));

  return {
    todayCount,
    todayRevenueCents,
    totalCount: documents.length,
    averageOrderCents:
      documents.length === 0 ? 0 : Math.round(revenueCents / documents.length),
    needsAction,
    delivered: countByStatus.Delivered ?? 0,
    revenueCents,
    countByStatus,
    revenueByStatusCents,
    monthlyRevenueCents,
    perDay,
  };
}

/**
 * Record an order before it is paid for.
 *
 * Written first, marked paid later by the webhook. The current site does the
 * opposite: the browser confirms the payment itself and then posts the order,
 * so an order can be recorded that was never paid for, and a payment can
 * succeed while the order explaining it is never written at all.
 */
export async function createPending(order: {
  userId: string | null;
  items: OrderItemDocument[];
  amountCents: number;
  customer: Order["customer"];
  pickup: boolean;
  paymentIntentId: string;
}): Promise<string> {
  const id = new ObjectId();

  await (await orders()).insertOne({
    _id: id,
    user: order.userId ? new ObjectId(order.userId) : new ObjectId(),
    items: order.items,
    amount: order.amountCents / 100,
    address: order.customer.address,
    city: order.customer.city,
    zipcode: order.customer.zipcode,
    phone: order.customer.phone,
    email: order.customer.email,
    name: order.customer.name,
    paymentMethod: "Stripe",
    pickup: order.pickup,
    status: "Awaiting payment",
    paymentIntentId: order.paymentIntentId,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as OrderDocument & { paymentIntentId: string });

  return id.toString();
}

/**
 * Mark an order paid.
 *
 * Keyed on the payment rather than the order id, because the webhook is told
 * about a payment and has to find the order it belongs to. Idempotent: Stripe
 * retries anything it did not get a clean answer to, and the same payment
 * arriving twice must not produce two paid orders.
 */
export async function markPaid(paymentIntentId: string): Promise<boolean> {
  const result = await (await orders()).updateOne(
    { paymentIntentId, status: "Awaiting payment" } as Record<string, unknown>,
    { $set: { status: "Pending", paidAt: new Date(), updatedAt: new Date() } },
  );

  return result.modifiedCount === 1;
}

/** Find an order by its payment, for the page a customer lands on afterwards. */
export async function findByPayment(
  paymentIntentId: string,
): Promise<Order | null> {
  const document = await (await orders()).findOne({
    paymentIntentId,
  } as Record<string, unknown>);

  return document ? toOrder(document) : null;
}

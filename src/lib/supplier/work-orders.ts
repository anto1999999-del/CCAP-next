import "server-only";
import { recordProOrderNumber } from "@/lib/orders/repository";
import type { Order } from "@/lib/orders/types";
import { fetchPinnacleStatus, pinnacleConfig } from "./pinnacle-client";

/**
 * Pinnacle Pro's work order number for the orders on screen.
 *
 * The Order API's reply to a send carries no Pinnacle number: the order is
 * queued, and Pinnacle Pro gives it a number when it imports it, which can be
 * later. So the number is read with the API's status lookup when the back
 * office lists the order, and stored once there is one, after which it is
 * never looked up again.
 *
 * Read-only towards Pinnacle. Each order is looked up at most once an hour
 * (remembered in this process), so paging through the list does not hammer
 * the API, and a slow or failed lookup is skipped, never shown as an error.
 */

const RECHECK_MS = 60 * 60 * 1000;
const lastLooked = new Map<string, number>();

export async function withWorkOrderNumbers(list: Order[]): Promise<Order[]> {
  const config = pinnacleConfig();
  if (!config) return list;

  const now = Date.now();
  const due = list.filter(
    (order) =>
      order.supplier?.state === "sent" &&
      !order.supplier.proOrderNumber &&
      now - (lastLooked.get(order.id) ?? 0) > RECHECK_MS,
  );
  if (due.length === 0) return list;

  const found = new Map<string, number>();
  await Promise.all(
    due.map(async (order) => {
      lastLooked.set(order.id, now);
      // The website order id is what was sent as the external reference.
      const status = await fetchPinnacleStatus(config, order.id);
      if (!status?.proOrderNumber) return;
      found.set(order.id, status.proOrderNumber);
      await recordProOrderNumber(order.id, status.proOrderNumber);
    }),
  );

  if (found.size === 0) return list;
  return list.map((order) =>
    found.has(order.id) && order.supplier
      ? {
          ...order,
          supplier: { ...order.supplier, proOrderNumber: found.get(order.id) },
        }
      : order,
  );
}

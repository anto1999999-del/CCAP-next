import "server-only";
import { loadCatalog } from "@/lib/parts/catalog";
import type { Order } from "./types";

/**
 * Which parts on an order can still be linked to a page.
 *
 * Used parts are sold once, so most of what appears on an order has left the
 * catalogue by the time anybody looks back at it. Measured on 28 August 2026:
 * of 52 line items across 36 orders, 19 were still listed and 27 were gone.
 *
 * So the item name is only a link when the part actually resolves. Linking
 * everything would send more than half of all clicks to a "part not found"
 * page, which is a worse answer than plain text -- the customer learns nothing
 * and assumes the site is broken rather than that the part sold.
 *
 * The catalogue is already in memory for every request, so this is a set of
 * string lookups and costs nothing worth measuring.
 */

/** How a bought line item is matched against the catalogue. */
export function itemKey(item: {
  urgId?: string;
  invNumber?: string;
}): string | null {
  // The four oldest orders predate the catalogue integration and carry neither.
  if (!item.urgId || !item.invNumber) return null;
  return `${item.urgId}|${item.invNumber}`;
}

/**
 * The keys, out of the orders given, whose part is still in the catalogue.
 *
 * Pass every order the page is about to render and ask this once, rather than
 * once per line.
 */
export async function listedItemKeys(
  orders: readonly Order[],
): Promise<Set<string>> {
  const wanted = new Set<string>();
  for (const order of orders) {
    for (const item of order.items) {
      const key = itemKey(item);
      if (key) wanted.add(key);
    }
  }

  if (wanted.size === 0) return wanted;

  const { parts } = await loadCatalog();
  const listed = new Set<string>();

  for (const part of parts) {
    const key = `${part.urgId}|${part.invNumber}`;
    if (wanted.has(key)) listed.add(key);
  }

  return listed;
}

/** The part page for a line item, or null when it is no longer listed. */
export function itemHref(
  item: { urgId?: string; invNumber?: string },
  listed: ReadonlySet<string>,
): string | null {
  const key = itemKey(item);
  if (!key || !listed.has(key)) return null;
  return `/product/${item.urgId}/${item.invNumber}`;
}

import type { CartLine } from "./types";

const STORAGE_KEY = "cart";

/**
 * Read the cart from localStorage, tolerating anything that might be in there.
 *
 * The previous implementation called `JSON.parse(localStorage.getItem("cart"))`
 * twice, unguarded, during React's initial state setup. Any corrupt or
 * hand-edited value threw before the error boundary had mounted, so the whole
 * app rendered a blank page and the only fix was clearing site data by hand.
 *
 * Anything unreadable is treated as an empty cart: a shopper losing their
 * basket is a far better outcome than a site that will not load.
 */
export function readCart(): CartLine[] {
  if (typeof window === "undefined") return [];

  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Private browsing and some embedded webviews deny storage access outright.
    return [];
  }
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isCartLine);
  } catch {
    return [];
  }
}

export function writeCart(lines: CartLine[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  } catch {
    // Storage full or blocked. The in-memory cart still works for this visit,
    // which is preferable to interrupting the shopper with an error.
  }
}

/**
 * Structural check on a single stored line.
 *
 * Deliberately strict: a malformed line that survives into the cart resurfaces
 * later as a broken price or a crash during checkout, which is much harder to
 * trace than simply dropping it here.
 */
function isCartLine(value: unknown): value is CartLine {
  if (typeof value !== "object" || value === null) return false;
  const line = value as Record<string, unknown>;
  return (
    typeof line.urgId === "string" &&
    typeof line.invNumber === "string" &&
    typeof line.itemName === "string" &&
    typeof line.price === "number" &&
    Number.isFinite(line.price) &&
    typeof line.quantity === "number" &&
    Number.isInteger(line.quantity) &&
    line.quantity > 0
  );
}

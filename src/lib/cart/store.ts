import type { CartLine } from "./types";
import { readCart, writeCart } from "./storage";

/**
 * The cart as an external store, in the shape `useSyncExternalStore` expects.
 *
 * localStorage is genuinely external to React: it survives reloads, and another
 * tab can change it underneath us. Modelling it as an external store rather
 * than mirroring it into `useState` inside an effect means React handles the
 * server snapshot, hydration and tearing itself, and there is exactly one copy
 * of the truth instead of two that have to be kept in step.
 */

type Listener = () => void;

const listeners = new Set<Listener>();

/**
 * `getSnapshot` must return a referentially stable value between real changes,
 * or React re-renders forever. Parsing on every call would return a fresh array
 * each time, so the parsed result is cached against the raw string it came from
 * and only recomputed when that string actually differs.
 */
let cachedRaw: string | null = null;
let cachedLines: CartLine[] = [];

/** Frozen so an empty cart is never accidentally mutated in place. */
const EMPTY: readonly CartLine[] = Object.freeze([]);

function currentRaw(): string | null {
  try {
    return window.localStorage.getItem("cart");
  } catch {
    return null;
  }
}

export function getSnapshot(): CartLine[] {
  const raw = currentRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedLines = readCart();
  }
  return cachedLines;
}

/**
 * The server has no cart. Returning a single frozen array (rather than a new
 * `[]`) keeps the reference stable across renders, which React requires.
 */
export function getServerSnapshot(): CartLine[] {
  return EMPTY as CartLine[];
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);

  // `storage` fires only in *other* tabs, which is what keeps several open tabs
  // consistent. Same-tab updates are announced by `emit` below.
  const onStorage = (event: StorageEvent) => {
    if (event.key === "cart" || event.key === null) listener();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function emit(): void {
  for (const listener of listeners) listener();
}

/** Persist a new cart and notify this tab. */
export function setCart(lines: CartLine[]): void {
  writeCart(lines);
  // Invalidate eagerly: if the write failed (storage full, private browsing)
  // the snapshot still needs to reflect what the shopper just did for the rest
  // of this visit.
  cachedRaw = currentRaw();
  cachedLines = lines;
  emit();
}

/** Apply a change to the current cart. */
export function updateCart(
  update: (lines: CartLine[]) => CartLine[],
): void {
  setCart(update(getSnapshot()));
}

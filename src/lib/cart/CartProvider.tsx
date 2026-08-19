"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import { isSameLine, type CartLine, type PartRef } from "./types";
import {
  getServerSnapshot,
  getSnapshot,
  subscribe,
  updateCart,
} from "./store";

type CartContextValue = {
  lines: CartLine[];
  /** Total number of items, counting quantities. */
  count: number;
  /** Indicative total in dollars. The server re-prices before charging. */
  subtotal: number;
  add: (line: Omit<CartLine, "quantity">, quantity?: number) => void;
  remove: (ref: PartRef) => void;
  setQuantity: (ref: PartRef, quantity: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  // Reads straight from localStorage via the external store. On the server, and
  // for the first client render, this is an empty cart — so the markup matches
  // and React can hydrate without a mismatch, then re-render with the real cart.
  const lines = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const add = useCallback(
    (line: Omit<CartLine, "quantity">, quantity = 1) => {
      updateCart((current) => {
        const existing = current.find((l) => isSameLine(l, line));
        if (!existing) return [...current, { ...line, quantity }];
        return current.map((l) =>
          isSameLine(l, line) ? { ...l, quantity: l.quantity + quantity } : l,
        );
      });
    },
    [],
  );

  const remove = useCallback((ref: PartRef) => {
    updateCart((current) => current.filter((l) => !isSameLine(l, ref)));
  }, []);

  const setQuantity = useCallback((ref: PartRef, quantity: number) => {
    updateCart((current) =>
      current.map((l) =>
        isSameLine(l, ref) ? { ...l, quantity: Math.max(1, quantity) } : l,
      ),
    );
  }, []);

  const clear = useCallback(() => updateCart(() => []), []);

  const value = useMemo<CartContextValue>(() => {
    const count = lines.reduce((total, l) => total + l.quantity, 0);
    const subtotal = lines.reduce((total, l) => total + l.price * l.quantity, 0);
    return { lines, count, subtotal, add, remove, setQuantity, clear };
  }, [lines, add, remove, setQuantity, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used inside <CartProvider>.");
  }
  return context;
}

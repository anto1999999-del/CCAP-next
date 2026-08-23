"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart/CartProvider";
import type { CartLine } from "@/lib/cart/types";

/**
 * Put a part in the cart.
 *
 * The line carries the supplier's price so the cart can show a running total,
 * but that number is indicative only: the server re-prices every line from the
 * catalogue before anything is charged. A price that arrives from a browser is
 * a price a customer can edit.
 */
export default function AddToCartButton({
  line,
  className = "",
}: {
  line: Omit<CartLine, "quantity">;
  className?: string;
}) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        add(line);
        setAdded(true);
        // Long enough to read, short enough that the button is ready again for
        // someone adding several parts off one page.
        setTimeout(() => setAdded(false), 2000);
      }}
      className={className}
    >
      <span aria-live="polite">{added ? "Added to cart" : "Add to Cart"}</span>
    </button>
  );
}

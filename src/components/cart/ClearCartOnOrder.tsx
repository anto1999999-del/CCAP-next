"use client";

import { useEffect } from "react";
import { useCart } from "@/lib/cart/CartProvider";

/**
 * Empty the cart once an order exists for the payment.
 *
 * The cart lives in the browser and the order lives in the database, so nothing
 * on the server can clear it. Without this a customer who has just paid still
 * has the parts sitting in their cart, and the badge in the header still says
 * three, which reads as though the order did not go through.
 *
 * Rendered only when the order-success page actually found an order for the
 * payment id it was given. Landing on that page with an id that matches nothing
 * leaves the cart alone, because there is no evidence anything was bought.
 *
 * It renders nothing. The clearing is the whole point of it.
 */
export default function ClearCartOnOrder({ orderId }: { orderId: string }) {
  const { clear } = useCart();

  useEffect(() => {
    clear();
    /*
      Keyed on the order rather than on `clear`, which is a new function on
      every render of the provider and would empty the cart on a loop.
    */
  }, [orderId]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

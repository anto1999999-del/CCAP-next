import type { Metadata } from "next";
import CartContents from "@/components/cart/CartContents";

export const metadata: Metadata = {
  title: "Your Cart | Central Coast Auto Parts",
  /*
    Kept out of search results deliberately. A cart is one person's, it is
    empty for everyone else, and an indexed empty cart is a page that tells a
    searcher this shop has nothing.
  */
  robots: { index: false, follow: true },
};

export default function CartPage() {
  return <CartContents />;
}

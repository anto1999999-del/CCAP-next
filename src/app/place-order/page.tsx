import type { Metadata } from "next";
import Checkout from "@/components/checkout/Checkout";

export const metadata: Metadata = {
  title: "Checkout | Central Coast Auto Parts",
  // One person's order in progress. Nothing here belongs in search results.
  robots: { index: false, follow: false },
};

export default function PlaceOrderPage() {
  return <Checkout />;
}

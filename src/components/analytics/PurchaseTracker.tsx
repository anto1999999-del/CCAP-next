"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics/gtag";

/**
 * Records the purchase, once, when the confirmation page shows a paid order.
 *
 * Once per order, not once per visit: a customer who reloads the confirmation
 * or opens it again from their history would otherwise be counted as buying
 * twice, and Google Ads would bid on revenue that never happened. The order's
 * payment id is remembered in this browser after the first send. A browser
 * that will not store it still sends, because a missed sale is worse than the
 * rare double count from a locked-down browser.
 *
 * Everything sent comes from the order in the database, rendered by the server
 * -- never from the address bar.
 */

export type TrackedPurchase = {
  /** Stripe's payment id: unique per order and on Stripe's own records. */
  transactionId: string;
  /** Dollars, the full amount charged: parts plus freight, GST included. */
  value: number;
  items: {
    item_id: string;
    item_name: string;
    price: number;
    quantity: number;
  }[];
};

const SENT_PREFIX = "ccap-purchase-tracked:";

export default function PurchaseTracker({
  purchase,
}: {
  purchase: TrackedPurchase;
}) {
  useEffect(() => {
    const key = SENT_PREFIX + purchase.transactionId;
    try {
      if (window.localStorage.getItem(key)) return;
      window.localStorage.setItem(key, new Date().toISOString());
    } catch {
      // Storage refused: send anyway (see above).
    }

    track(
      "purchase",
      {
        transaction_id: purchase.transactionId,
        value: purchase.value,
        currency: "AUD",
        items: purchase.items,
      },
      {
        conversion: "purchase",
        value: purchase.value,
        currency: "AUD",
        transactionId: purchase.transactionId,
      },
    );
  }, [purchase]);

  return null;
}

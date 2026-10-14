import type { Metadata } from "next";
import Link from "next/link";
import ClearCartOnOrder from "@/components/cart/ClearCartOnOrder";
import PurchaseTracker from "@/components/analytics/PurchaseTracker";
import { findByPayment } from "@/lib/orders/repository";
import { isConfigured } from "@/lib/db/mongo";
import { formatCents } from "@/lib/parts/price";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Order Received | Central Coast Auto Parts",
  robots: { index: false, follow: false },
};

/**
 * Where the customer lands after paying.
 *
 * Stripe sends them back with the payment's id in the address. That id is used
 * to look the order up, and nothing on this page is taken from the address bar
 * beyond it: what is shown is what the database holds.
 *
 * The order may still say it is awaiting payment when this page renders, since
 * the webhook and the customer's browser are racing. That is not an error and
 * is not presented as one.
 */
export default async function OrderSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ payment_intent?: string; redirect_status?: string }>;
}) {
  const { payment_intent: paymentIntent, redirect_status: redirectStatus } =
    await searchParams;
  const order =
    paymentIntent && isConfigured() ? await findByPayment(paymentIntent) : null;

  /*
    A sale is recorded only for money that moved: Stripe says the payment
    succeeded when it sends the customer here, or the webhook has already
    marked the order paid. A customer whose card was declined can land on this
    page too, and is not a conversion.
  */
  const paid =
    order !== null &&
    paymentIntent !== undefined &&
    // The stored status is wider than OrderStatus: an unpaid order carries
    // "Awaiting payment", which the type leaves out because pages never show it.
    (redirectStatus === "succeeded" ||
      String(order.status) !== "Awaiting payment");

  return (
    <div className="bg-admin flex min-h-[70vh] items-center justify-center px-4 py-16 text-white">
      <div className="w-full max-w-lg text-center">
        <h1 className="mb-3 text-3xl font-extrabold tracking-tight md:text-4xl">
          Thank you, we have your order
        </h1>

        {order ? (
          <>
            {/*
              The parts have been bought, so they come out of the cart. Nothing
              on the server can do that: the cart is in the customer's browser.
              Only rendered when an order was actually found for this payment,
              so landing here with an id that matches nothing leaves it alone.
            */}
            <ClearCartOnOrder orderId={order.id} />
            {paid && (
              <PurchaseTracker
                purchase={{
                  transactionId: paymentIntent,
                  value: order.amountCents / 100,
                  items: order.items.map((item) => ({
                    item_id: `${item.urgId ?? "part"}-${item.invNumber ?? ""}`,
                    item_name: item.name,
                    price: item.priceCents / 100,
                    quantity: item.quantity,
                  })),
                }}
              />
            )}
            <p className="mb-6 text-gray-300">
              {formatCents(order.amountCents)} for {order.items.length}{" "}
              {order.items.length === 1 ? "part" : "parts"}.
              {order.pickup
                ? " We will call you when it is ready to collect."
                : " We will be in touch about delivery."}
            </p>

            <ul className="bg-card border-line mb-8 space-y-1 rounded-2xl border p-6 text-left text-sm text-gray-300">
              {order.items.map((item, index) => (
                <li key={index} className="flex justify-between gap-4">
                  <span className="truncate">
                    {item.quantity} &times; {item.name}
                  </span>
                  <span className="shrink-0 text-gray-500">
                    {formatCents(item.priceCents * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mb-8 text-gray-300">
            A confirmation is on its way to your email. If anything looks wrong,
            call us on {site.contact.phone} and we will sort it out.
          </p>
        )}

        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/orders"
            className="bg-brand hover:bg-brand-hover rounded-full px-6 py-3 text-sm font-semibold text-white transition-colors"
          >
            See your orders
          </Link>
          <Link
            href="/products"
            className="rounded-full border-line border px-6 py-3 text-sm font-semibold text-gray-200 transition-colors hover:bg-white/5"
          >
            Keep browsing
          </Link>
        </div>
      </div>
    </div>
  );
}

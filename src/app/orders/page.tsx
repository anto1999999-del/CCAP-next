import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentAccount } from "@/lib/auth/accounts";
import { isConfigured } from "@/lib/db/mongo";
import { listForUser } from "@/lib/orders/repository";
import { formatCents } from "@/lib/parts/price";

export const metadata: Metadata = {
  title: "My Orders | Central Coast Auto Parts",
  robots: { index: false, follow: false },
};

const AU_DATE: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "long",
  year: "numeric",
};

export default async function OrdersPage() {
  if (!isConfigured()) redirect("/login");

  const account = await currentAccount();
  if (!account) redirect("/login?next=/orders");

  const orders = await listForUser(account.id);

  return (
    <div className="bg-surface min-h-screen px-4 py-12 text-white md:px-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-3xl font-extrabold tracking-tight md:text-4xl">
          Your orders
        </h1>

        {orders.length === 0 ? (
          <div className="bg-surface-raised rounded-2xl border border-gray-800 p-8 text-center">
            <p className="mb-4 text-gray-300">You have not ordered anything yet.</p>
            <Link
              href="/products"
              className="bg-brand hover:bg-brand-hover inline-block rounded-md px-6 py-3 font-semibold text-white transition-colors"
            >
              Browse parts
            </Link>
          </div>
        ) : (
          <ul className="space-y-4">
            {orders.map((order) => (
              <li
                key={order.id}
                className="bg-surface-raised rounded-2xl border border-gray-800 p-6"
              >
                <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <p className="text-lg font-bold">
                      {formatCents(order.amountCents)}
                    </p>
                    <p className="text-sm text-gray-400">
                      {order.placedAt
                        ? new Date(order.placedAt).toLocaleDateString("en-AU", AU_DATE)
                        : "Date not recorded"}
                      {order.pickup ? " · Pickup" : ""}
                    </p>
                  </div>
                  <span className="rounded-full border border-gray-700 px-3 py-1 text-xs font-semibold tracking-wide text-gray-200 uppercase">
                    {order.status}
                  </span>
                </div>

                <ul className="space-y-1 text-sm text-gray-300">
                  {order.items.map((item, index) => (
                    <li key={`${order.id}-${index}`} className="flex justify-between gap-4">
                      <span className="truncate">
                        {item.quantity} &times; {item.name}
                      </span>
                      <span className="shrink-0 text-gray-400">
                        {formatCents(item.priceCents * item.quantity)}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

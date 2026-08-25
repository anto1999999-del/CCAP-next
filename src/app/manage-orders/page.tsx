import type { Metadata } from "next";
import Link from "next/link";
import OrderRow from "@/components/admin/OrderRow";
import { adminOnly } from "@/lib/auth/guard";
import { listAll } from "@/lib/orders/repository";

export const metadata: Metadata = {
  title: "Manage Orders | Central Coast Auto Parts",
  robots: { index: false, follow: false },
};

export default async function ManageOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ hidden?: string }>;
}) {
  await adminOnly("/manage-orders");

  const { hidden } = await searchParams;
  const includeHidden = hidden === "1";
  const orders = await listAll({ includeHidden });

  return (
    <div className="bg-surface min-h-screen px-4 py-12 text-white md:px-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
              Orders
            </h1>
            <p className="mt-1 text-sm text-gray-400">
              {orders.length} {orders.length === 1 ? "order" : "orders"}
              {includeHidden ? ", including hidden ones" : ""}.
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href={includeHidden ? "/manage-orders" : "/manage-orders?hidden=1"}
              className="rounded-full border border-gray-700 px-4 py-2 text-sm font-semibold text-gray-200 transition-colors hover:bg-gray-800"
            >
              {includeHidden ? "Hide hidden" : "Show hidden"}
            </Link>
            <Link
              href="/dashboard"
              className="rounded-full border border-gray-700 px-4 py-2 text-sm font-semibold text-gray-200 transition-colors hover:bg-gray-800"
            >
              Dashboard
            </Link>
          </div>
        </header>

        {orders.length === 0 ? (
          <p className="bg-surface-raised rounded-2xl border border-gray-800 p-8 text-center text-gray-400">
            No orders to show.
          </p>
        ) : (
          <ul className="space-y-4">
            {orders.map((order) => (
              <OrderRow key={order.id} order={order} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

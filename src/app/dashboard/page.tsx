import type { Metadata } from "next";
import Link from "next/link";
import { adminOnly } from "@/lib/auth/guard";
import { listAccounts } from "@/lib/auth/accounts";
import { summarise } from "@/lib/orders/repository";
import { formatCents } from "@/lib/parts/price";

export const metadata: Metadata = {
  title: "Dashboard | Central Coast Auto Parts",
  robots: { index: false, follow: false },
};

export default async function DashboardPage() {
  const admin = await adminOnly("/dashboard");
  const [orders, accounts] = await Promise.all([summarise(), listAccounts()]);

  return (
    <div className="bg-surface min-h-screen px-4 py-12 text-white md:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10">
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Signed in as {admin.name}. Hidden orders are left out of every figure
            here.
          </p>
        </header>

        <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Stat label="Orders" value={orders.count.toLocaleString()} />
          <Stat label="Revenue" value={formatCents(orders.revenueCents)} />
          <Stat label="Accounts" value={accounts.length.toLocaleString()} />
        </div>

        <section className="bg-surface-raised mb-10 rounded-2xl border border-gray-800 p-6">
          <h2 className="mb-4 text-xl font-bold">Orders by status</h2>
          {orders.count === 0 ? (
            <p className="text-sm text-gray-400">No orders yet.</p>
          ) : (
            <ul className="space-y-2">
              {Object.entries(orders.byStatus).map(([status, count]) => (
                <li key={status} className="flex justify-between text-sm">
                  <span className="text-gray-300">{status}</span>
                  <span className="font-semibold">{count}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/manage-orders"
            className="bg-brand hover:bg-brand-hover rounded-full px-6 py-3 text-sm font-semibold text-white transition-colors"
          >
            Manage orders
          </Link>
          <Link
            href="/manage-users"
            className="rounded-full border border-gray-700 px-6 py-3 text-sm font-semibold text-gray-200 transition-colors hover:bg-gray-800"
          >
            Manage users
          </Link>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface-raised rounded-2xl border border-gray-800 p-6">
      <p className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
        {label}
      </p>
      <p className="mt-2 text-2xl font-extrabold">{value}</p>
    </div>
  );
}

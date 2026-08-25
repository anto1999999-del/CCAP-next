import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import AccountShell, { StatCard } from "@/components/account/AccountShell";
import AccountDetailsForm from "@/components/account/AccountDetailsForm";
import { currentAccount } from "@/lib/auth/accounts";
import { isConfigured } from "@/lib/db/mongo";
import { listForUser } from "@/lib/orders/repository";
import { STATUS_TEXT } from "@/lib/orders/status";
import { formatCents } from "@/lib/parts/price";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "My Profile | Central Coast Auto Parts",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const AU_DATE = new Intl.DateTimeFormat("en-AU", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default async function MyAccountPage() {
  if (!isConfigured()) redirect("/login");

  const account = await currentAccount();
  if (!account) redirect("/login?next=/my-account");

  const orders = await listForUser(account.id);
  const spentCents = orders.reduce(
    (total, order) => total + order.amountCents,
    0,
  );
  const latest = orders[0];

  return (
    <AccountShell account={account} active="/my-account" title="My profile">
      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Orders" value={String(orders.length)} />
        <StatCard
          label="Spent with us"
          value={formatCents(spentCents)}
          tone="brand"
        />
        <StatCard
          label="Last order"
          value={
            latest?.placedAt
              ? AU_DATE.format(new Date(latest.placedAt))
              : "None yet"
          }
          hint={latest?.status}
        />
        <StatCard
          label="Email"
          value={account.email.split("@")[0]}
          hint={`@${account.email.split("@")[1] ?? ""}`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
        <section className="border-line bg-card rounded-2xl border p-5 md:p-6">
          <h2 className="mb-1 text-lg font-bold">Your details</h2>
          <p className="mb-6 text-sm text-gray-400">
            We fill the checkout in with these, so you do not type them again.
          </p>
          <AccountDetailsForm account={account} />
        </section>

        <div className="space-y-4">
          <section className="border-line bg-card rounded-2xl border p-5 md:p-6">
            <div className="mb-4 flex items-baseline justify-between gap-4">
              <h2 className="text-lg font-bold">Recent orders</h2>
              <Link
                href="/orders"
                className="text-brand-text text-sm font-semibold hover:underline"
              >
                See all
              </Link>
            </div>

            {orders.length === 0 ? (
              <p className="text-sm text-gray-400">
                Nothing ordered yet.{" "}
                <Link
                  href="/products"
                  className="text-brand-text hover:underline"
                >
                  Browse parts
                </Link>
                .
              </p>
            ) : (
              <ul className="space-y-3">
                {orders.slice(0, 5).map((order) => (
                  <li
                    key={order.id}
                    className="border-line/70 flex items-baseline justify-between gap-4 border-b pb-3 last:border-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {order.items[0]?.name ?? "Order"}
                        {order.items.length > 1 &&
                          ` +${order.items.length - 1} more`}
                      </p>
                      <p className="text-xs text-gray-500">
                        {order.placedAt
                          ? AU_DATE.format(new Date(order.placedAt))
                          : ""}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-sm font-semibold tabular-nums">
                        {formatCents(order.amountCents)}
                      </p>
                      <p
                        className={`text-xs font-semibold ${
                          STATUS_TEXT[order.status] ?? "text-gray-400"
                        }`}
                      >
                        {order.status}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="border-line bg-card rounded-2xl border p-5 md:p-6">
            <h2 className="mb-1 text-lg font-bold">Need a hand?</h2>
            <p className="mb-4 text-sm text-gray-400">
              Questions about an order, a return, or a part you cannot find.
            </p>
            <a
              href={`tel:${site.contact.phoneE164}`}
              className="bg-brand hover:bg-brand-hover block rounded-xl px-4 py-3 text-center text-sm font-semibold text-white transition-colors"
            >
              Call {site.contact.phone}
            </a>
          </section>
        </div>
      </div>
    </AccountShell>
  );
}

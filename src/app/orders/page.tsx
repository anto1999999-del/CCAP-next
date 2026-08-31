import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import AccountShell, { StatCard } from "@/components/account/AccountShell";
import PartThumbnail from "@/components/parts/PartThumbnail";
import { currentAccount } from "@/lib/auth/accounts";
import { isConfigured } from "@/lib/db/mongo";
import { itemHref, listedItemKeys } from "@/lib/orders/listed";
import { listForUser } from "@/lib/orders/repository";
import { STATUS_TEXT } from "@/lib/orders/status";
import { PART_IMAGE_PLACEHOLDER } from "@/lib/parts/images";
import { formatCents } from "@/lib/parts/price";

export const metadata: Metadata = {
  title: "My Orders | Central Coast Auto Parts",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const AU_DATE = new Intl.DateTimeFormat("en-AU", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default async function OrdersPage() {
  if (!isConfigured()) redirect("/login");

  const account = await currentAccount();
  if (!account) redirect("/login?next=/orders");

  const orders = await listForUser(account.id);
  // Asked once for the whole page rather than once per line.
  const listed = await listedItemKeys(orders);
  const spentCents = orders.reduce(
    (total, order) => total + order.amountCents,
    0,
  );
  const open = orders.filter((order) => order.status !== "Delivered").length;

  return (
    <AccountShell account={account} active="/orders" title="My orders">
      {orders.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
          <StatCard label="Orders" value={String(orders.length)} />
          <StatCard
            label="Spent with us"
            value={formatCents(spentCents)}
            tone="brand"
          />
          <StatCard
            label="On the way"
            value={String(open)}
            tone={open > 0 ? "warn" : "plain"}
            hint={open === 0 ? "All delivered" : "Not delivered yet"}
          />
          <StatCard
            label="Last order"
            value={
              orders[0]?.placedAt
                ? AU_DATE.format(new Date(orders[0].placedAt))
                : "-"
            }
          />
        </div>
      )}

      {orders.length === 0 ? (
        <div className="border-line bg-card rounded-2xl border p-10 text-center">
          <p className="mb-5 text-gray-300">
            You have not ordered anything yet.
          </p>
          <Link
            href="/products"
            className="bg-brand hover:bg-brand-hover inline-block rounded-xl px-6 py-3 font-semibold text-white transition-colors"
          >
            Browse parts
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {orders.map((order) => (
            <li
              key={order.id}
              className="border-line bg-card overflow-hidden rounded-2xl border"
            >
              <div className="border-line/70 flex flex-wrap items-baseline justify-between gap-3 border-b px-5 py-4">
                <div>
                  <p className="text-lg font-bold tabular-nums">
                    {formatCents(order.amountCents)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {order.placedAt
                      ? AU_DATE.format(new Date(order.placedAt))
                      : ""}
                    {order.pickup
                      ? " · Pickup from Berkeley Vale"
                      : " · Delivery"}
                  </p>
                </div>
                <span
                  className={`border-line rounded-full border px-3 py-1 text-xs font-semibold tracking-wide uppercase ${
                    STATUS_TEXT[order.status] ?? "text-gray-300"
                  }`}
                >
                  {order.status}
                </span>
              </div>

              <ul className="divide-line/60 divide-y">
                {order.items.map((item, index) => (
                  <li
                    key={`${order.id}-${index}`}
                    className="flex items-center gap-4 px-5 py-4"
                  >
                    <PartThumbnail
                      src={item.image ?? PART_IMAGE_PLACEHOLDER}
                      alt={item.name}
                      className="h-16 w-20 flex-shrink-0 rounded-lg object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      {/*
                        A link only while the part is still listed. Most bought
                        parts have sold, and a link to a "not found" page reads
                        as a broken site rather than as stock that moved.
                      */}
                      <p className="truncate text-sm font-medium">
                        {itemHref(item, listed) ? (
                          <Link
                            href={itemHref(item, listed) as string}
                            className="hover:text-brand-text underline-offset-4 transition-colors hover:underline"
                          >
                            {item.name}
                          </Link>
                        ) : (
                          item.name
                        )}
                      </p>
                      {item.vehicle && (
                        <p className="truncate text-xs text-gray-500">
                          {item.vehicle}
                        </p>
                      )}
                    </div>
                    <p className="flex-shrink-0 text-sm text-gray-400 tabular-nums">
                      {item.quantity} &times; {formatCents(item.priceCents)}
                    </p>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </AccountShell>
  );
}

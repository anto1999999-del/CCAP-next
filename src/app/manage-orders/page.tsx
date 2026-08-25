import type { Metadata } from "next";
import Link from "next/link";
import AccountShell, { StatCard } from "@/components/account/AccountShell";
import OrderRow from "@/components/admin/OrderRow";
import { adminOnly } from "@/lib/auth/guard";
import {
  countByStatus,
  listOrders,
  summarise,
} from "@/lib/orders/repository";
import { ORDER_STATUSES } from "@/lib/orders/types";
import { formatCents } from "@/lib/parts/price";

export const metadata: Metadata = {
  title: "Manage Orders | Central Coast Auto Parts",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  q?: string;
  status?: string;
  sort?: string;
  page?: string;
}>;

/** Every filter lives in the URL, so a filtered view can be linked and shared. */
function href(
  current: { q: string; status: string; sort: string },
  change: Partial<{ q: string; status: string; sort: string; page: number }>,
): string {
  const params = new URLSearchParams();
  const merged = { ...current, ...change };

  if (merged.q) params.set("q", merged.q);
  if (merged.status) params.set("status", merged.status);
  if (merged.sort && merged.sort !== "newest") params.set("sort", merged.sort);
  if (change.page && change.page > 1) params.set("page", String(change.page));

  const query = params.toString();
  return query ? `/manage-orders?${query}` : "/manage-orders";
}

export default async function ManageOrdersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const admin = await adminOnly("/manage-orders");
  const params = await searchParams;

  const current = {
    q: params.q?.trim() ?? "",
    status: params.status ?? "",
    sort: params.sort === "oldest" ? "oldest" : "newest",
  };

  const [page, counts, summary] = await Promise.all([
    listOrders({
      search: current.q,
      status: current.status,
      sort: current.sort as "newest" | "oldest",
      page: Number(params.page) || 1,
    }),
    countByStatus(),
    summarise(),
  ]);

  const filters = ["All", ...ORDER_STATUSES, "Hidden"];

  return (
    <AccountShell account={admin} active="/manage-orders" title="Orders">
      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          label="Needs action"
          value={String(summary.needsAction)}
          hint="Pending or processing"
          tone={summary.needsAction > 0 ? "warn" : "plain"}
        />
        <StatCard label="Total orders" value={String(summary.totalCount)} />
        <StatCard
          label="Delivered"
          value={String(summary.delivered)}
          tone="good"
        />
        <StatCard
          label="Total revenue"
          value={formatCents(summary.revenueCents)}
          tone="brand"
        />
      </div>

      <div className="border-line bg-card mb-6 rounded-2xl border p-4 md:p-5">
        <form
          action="/manage-orders"
          method="GET"
          className="mb-4 flex flex-col gap-3 sm:flex-row"
        >
          {current.status && (
            <input type="hidden" name="status" value={current.status} />
          )}

          <label htmlFor="order-search" className="sr-only">
            Search orders
          </label>
          <input
            id="order-search"
            name="q"
            type="search"
            defaultValue={current.q}
            placeholder="Search part, customer, phone, address or order id"
            className="focus:border-brand border-line min-w-0 flex-1 rounded-xl border bg-[#0b0b0d] px-4 py-2.5 text-sm text-white placeholder-gray-600 transition-colors focus:outline-none"
          />

          <label htmlFor="order-sort" className="sr-only">
            Sort orders
          </label>
          <select
            id="order-sort"
            name="sort"
            defaultValue={current.sort}
            className="focus:border-brand border-line rounded-xl border bg-[#0b0b0d] px-4 py-2.5 text-sm text-white focus:outline-none"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>

          <button
            type="submit"
            className="bg-brand hover:bg-brand-hover rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-colors"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap gap-2">
          {filters.map((label) => {
            const value = label === "All" ? "" : label;
            const active = current.status === value;
            const count = counts[label] ?? 0;

            return (
              <Link
                key={label}
                href={href(current, { status: value, page: 1 })}
                aria-current={active ? "true" : undefined}
                className={
                  active
                    ? "bg-brand rounded-full px-4 py-1.5 text-sm font-semibold text-white"
                    : "border-line rounded-full border px-4 py-1.5 text-sm font-medium text-gray-300 transition-colors hover:border-white/30 hover:text-white"
                }
              >
                {label}
                <span
                  className={active ? "ml-2 opacity-80" : "ml-2 text-gray-500"}
                >
                  {count}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="border-line bg-card overflow-hidden rounded-2xl border">
        <div className="border-line hidden border-b px-5 py-3 text-xs font-semibold tracking-wider text-gray-500 uppercase md:grid md:grid-cols-[minmax(0,2.2fr)_repeat(5,minmax(0,1fr))] md:gap-3">
          <span>Item</span>
          <span>Order id</span>
          <span>Date</span>
          <span>Total</span>
          <span>Status</span>
          <span className="text-right">Change</span>
        </div>

        {page.orders.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-gray-500">
            {current.q
              ? `Nothing matches "${current.q}".`
              : "No orders to show."}
          </p>
        ) : (
          <ul>
            {page.orders.map((order) => (
              <OrderRow key={order.id} order={order} />
            ))}
          </ul>
        )}
      </div>

      {page.total > 0 && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            Showing <strong className="text-gray-300">{page.from}</strong> to{" "}
            <strong className="text-gray-300">{page.to}</strong> of{" "}
            <strong className="text-gray-300">{page.total}</strong> orders
          </p>

          {page.pageCount > 1 && (
            <div className="flex items-center gap-2">
              <Step
                href={href(current, { page: page.page - 1 })}
                disabled={page.page === 1}
              >
                Prev
              </Step>
              <span className="text-sm text-gray-500">
                Page {page.page} of {page.pageCount}
              </span>
              <Step
                href={href(current, { page: page.page + 1 })}
                disabled={page.page === page.pageCount}
              >
                Next
              </Step>
            </div>
          )}
        </div>
      )}
    </AccountShell>
  );
}

function Step({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span className="border-line cursor-not-allowed rounded-lg border px-4 py-2 text-sm font-semibold text-gray-600">
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className="border-line rounded-lg border px-4 py-2 text-sm font-semibold text-gray-200 transition-colors hover:border-white/30 hover:text-white"
    >
      {children}
    </Link>
  );
}

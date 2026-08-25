import type { Metadata } from "next";
import Link from "next/link";
import AccountShell, { StatCard } from "@/components/account/AccountShell";
import {
  ChartCard,
  DailyBars,
  RevenueByStatus,
  RevenueLine,
  StatusRing,
} from "@/components/admin/Charts";
import { adminOnly } from "@/lib/auth/guard";
import { listAccounts } from "@/lib/auth/accounts";
import { listOrders, summarise } from "@/lib/orders/repository";
import { STATUS_COLOURS } from "@/lib/orders/status";
import { formatCents } from "@/lib/parts/price";

export const metadata: Metadata = {
  title: "Dashboard | Central Coast Auto Parts",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const AU_DATE = new Intl.DateTimeFormat("en-AU", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export default async function DashboardPage() {
  const admin = await adminOnly("/dashboard");

  const [summary, recent, accounts] = await Promise.all([
    summarise(),
    listOrders({ perPage: 8 }),
    listAccounts(),
  ]);

  return (
    <AccountShell account={admin} active="/dashboard" title="Dashboard">
      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          label="Today's orders"
          value={summary.todayCount.toLocaleString()}
        />
        <StatCard
          label="Today's revenue"
          value={formatCents(summary.todayRevenueCents)}
          tone="brand"
        />
        <StatCard
          label="Total orders"
          value={summary.totalCount.toLocaleString()}
          hint={`${accounts.length} accounts`}
        />
        <StatCard
          label="Average order"
          value={formatCents(summary.averageOrderCents)}
          hint={`${formatCents(summary.revenueCents)} all time`}
        />
      </div>

      {summary.needsAction > 0 && (
        <Link
          href="/manage-orders?status=Pending"
          className="border-brand/40 bg-card mb-6 flex items-center justify-between gap-4 rounded-2xl border p-5 transition-colors hover:border-brand/70"
        >
          <div>
            <p className="text-brand-text text-lg font-bold">
              {summary.needsAction}{" "}
              {summary.needsAction === 1 ? "order needs" : "orders need"} action
            </p>
            <p className="mt-0.5 text-sm text-gray-400">
              Pending or being processed.
            </p>
          </div>
          <span aria-hidden="true" className="text-brand-text text-xl">
            &rarr;
          </span>
        </Link>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard title="Revenue by month">
          <RevenueLine monthlyCents={summary.monthlyRevenueCents} />
        </ChartCard>

        <ChartCard title="Revenue by status">
          <RevenueByStatus
            revenueCents={summary.revenueByStatusCents}
            colours={STATUS_COLOURS}
          />
        </ChartCard>

        <ChartCard title="Orders by status">
          <StatusRing counts={summary.countByStatus} colours={STATUS_COLOURS} />
        </ChartCard>

        <ChartCard title="Orders per day">
          <DailyBars days={summary.perDay} />
        </ChartCard>
      </div>

      <ChartCard
        title="Recent orders"
        action={
          <Link
            href="/manage-orders"
            className="text-brand-text text-sm font-semibold hover:underline"
          >
            View all orders &rarr;
          </Link>
        }
      >
        {recent.orders.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">
            No orders yet.
          </p>
        ) : (
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-line border-b text-left text-xs tracking-wider text-gray-500 uppercase">
                  <th className="px-2 pb-3 font-semibold">Customer</th>
                  <th className="px-2 pb-3 font-semibold">Part</th>
                  <th className="px-2 pb-3 font-semibold">Date</th>
                  <th className="px-2 pb-3 text-right font-semibold">Total</th>
                  <th className="px-2 pb-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.orders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-line/60 border-b last:border-0"
                  >
                    <td className="max-w-[180px] truncate px-2 py-3 font-medium">
                      {order.customer.name}
                    </td>
                    <td className="max-w-[220px] truncate px-2 py-3 text-gray-400">
                      {order.items[0]?.name ?? "-"}
                      {order.items.length > 1 &&
                        ` +${order.items.length - 1} more`}
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap text-gray-400 tabular-nums">
                      {order.placedAt
                        ? AU_DATE.format(new Date(order.placedAt))
                        : "-"}
                    </td>
                    <td className="px-2 py-3 text-right font-semibold tabular-nums">
                      {formatCents(order.amountCents)}
                    </td>
                    <td className="px-2 py-3">
                      <span
                        className="text-xs font-semibold"
                        style={{ color: STATUS_COLOURS[order.status] }}
                      >
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ChartCard>
    </AccountShell>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import AccountDetailsForm from "@/components/account/AccountDetailsForm";
import { signOut } from "@/app/actions/auth";
import { currentAccount } from "@/lib/auth/accounts";
import { listForUser } from "@/lib/orders/repository";
import { isConfigured } from "@/lib/db/mongo";
import { formatCents } from "@/lib/parts/price";

export const metadata: Metadata = {
  title: "My Account | Central Coast Auto Parts",
  robots: { index: false, follow: false },
};

export default async function MyAccountPage() {
  if (!isConfigured()) redirect("/login");

  const account = await currentAccount();
  if (!account) redirect("/login?next=/my-account");

  const orders = await listForUser(account.id);
  const latest = orders[0];

  return (
    <div className="bg-surface min-h-screen px-4 py-12 text-white md:px-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
              My account
            </h1>
            <p className="mt-1 text-sm text-gray-400">
              Signed in as {account.email}
            </p>
          </div>

          <form action={signOut}>
            <button
              type="submit"
              className="rounded-full border border-gray-700 px-5 py-2.5 text-sm font-semibold text-gray-200 transition-colors hover:bg-gray-800"
            >
              Sign out
            </button>
          </form>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          <section className="bg-surface-raised rounded-2xl border border-gray-800 p-6">
            <h2 className="mb-1 text-xl font-bold">Your details</h2>
            <p className="mb-5 text-sm text-gray-400">
              Used to fill in the checkout, so you do not type them again.
            </p>
            <AccountDetailsForm account={account} />
          </section>

          <section className="bg-surface-raised rounded-2xl border border-gray-800 p-6">
            <h2 className="mb-1 text-xl font-bold">Your orders</h2>
            <p className="mb-5 text-sm text-gray-400">
              {orders.length === 0
                ? "Nothing ordered yet."
                : `${orders.length} ${orders.length === 1 ? "order" : "orders"}.`}
            </p>

            {latest && (
              <div className="mb-5 rounded-xl border border-gray-800 bg-[#0d0d0d] p-4">
                <p className="text-xs tracking-wide text-gray-500 uppercase">
                  Most recent
                </p>
                <p className="mt-1 font-semibold">
                  {formatCents(latest.amountCents)}
                </p>
                <p className="text-sm text-gray-400">
                  {latest.status}
                  {latest.placedAt
                    ? ` · ${new Date(latest.placedAt).toLocaleDateString("en-AU")}`
                    : ""}
                </p>
              </div>
            )}

            <Link
              href="/orders"
              className="text-brand-text font-semibold hover:underline"
            >
              {orders.length === 0 ? "Browse parts" : "See all orders"}
            </Link>
          </section>
        </div>

        {account.isAdmin && (
          <p className="mt-8 text-sm text-gray-400">
            You have admin access.{" "}
            <Link href="/dashboard" className="text-brand-text font-semibold hover:underline">
              Open the dashboard
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

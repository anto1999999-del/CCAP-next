import type { Metadata } from "next";
import Link from "next/link";
import AccountShell, { StatCard } from "@/components/account/AccountShell";
import UserRow from "@/components/admin/UserRow";
import { adminOnly } from "@/lib/auth/guard";
import { searchAccounts } from "@/lib/auth/accounts";

export const metadata: Metadata = {
  title: "Manage Users | Central Coast Auto Parts",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ManageUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const admin = await adminOnly("/manage-users");
  const params = await searchParams;

  const search = params.q?.trim() ?? "";
  const page = await searchAccounts({
    search,
    page: Number(params.page) || 1,
  });

  const admins = page.accounts.filter((account) => account.isAdmin).length;
  const link = (target: number) => {
    const query = new URLSearchParams();
    if (search) query.set("q", search);
    if (target > 1) query.set("page", String(target));
    const value = query.toString();
    return value ? `/manage-users?${value}` : "/manage-users";
  };

  return (
    <AccountShell account={admin} active="/manage-users" title="Users">
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Accounts" value={page.total.toLocaleString()} />
        <StatCard label="Admins on this page" value={String(admins)} tone="brand" />
        <StatCard
          label="Showing"
          value={`${page.from}-${page.to}`}
          hint={search ? `matching "${search}"` : "newest first"}
        />
      </div>

      <form
        action="/manage-users"
        method="GET"
        className="border-line bg-card mb-6 flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row md:p-5"
      >
        <label htmlFor="user-search" className="sr-only">
          Search accounts
        </label>
        <input
          id="user-search"
          name="q"
          type="search"
          defaultValue={search}
          placeholder="Search by name, email or phone"
          className="focus:border-brand border-line min-w-0 flex-1 rounded-xl border bg-field px-4 py-2.5 text-sm text-white placeholder-gray-600 transition-colors focus:outline-none"
        />
        <button
          type="submit"
          className="bg-brand hover:bg-brand-hover rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-colors"
        >
          Search
        </button>
      </form>

      <div className="border-line bg-card overflow-visible rounded-2xl border">
        <div className="border-line hidden border-b px-5 py-3 text-xs font-semibold tracking-wider text-gray-500 uppercase md:grid md:grid-cols-[minmax(0,1.4fr)_minmax(0,2fr)_minmax(0,1fr)_minmax(0,0.8fr)_auto] md:gap-3">
          <span>Name</span>
          <span>Email</span>
          <span>Phone</span>
          <span>Role</span>
          <span className="text-right">Actions</span>
        </div>

        {page.accounts.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-gray-500">
            {search ? `Nothing matches "${search}".` : "No accounts yet."}
          </p>
        ) : (
          <ul>
            {page.accounts.map((account) => (
              <UserRow
                key={account.id}
                account={account}
                isSelf={account.id === admin.id}
              />
            ))}
          </ul>
        )}
      </div>

      {page.total > 0 && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            Showing <strong className="text-gray-300">{page.from}</strong> to{" "}
            <strong className="text-gray-300">{page.to}</strong> of{" "}
            <strong className="text-gray-300">{page.total}</strong> accounts
          </p>

          {page.pageCount > 1 && (
            <div className="flex items-center gap-2">
              {page.page > 1 ? (
                <Link
                  href={link(page.page - 1)}
                  className="border-line rounded-lg border px-4 py-2 text-sm font-semibold text-gray-200 transition-colors hover:border-white/30"
                >
                  Prev
                </Link>
              ) : (
                <span className="border-line rounded-lg border px-4 py-2 text-sm font-semibold text-gray-600">
                  Prev
                </span>
              )}
              <span className="text-sm text-gray-500">
                Page {page.page} of {page.pageCount}
              </span>
              {page.page < page.pageCount ? (
                <Link
                  href={link(page.page + 1)}
                  className="border-line rounded-lg border px-4 py-2 text-sm font-semibold text-gray-200 transition-colors hover:border-white/30"
                >
                  Next
                </Link>
              ) : (
                <span className="border-line rounded-lg border px-4 py-2 text-sm font-semibold text-gray-600">
                  Next
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </AccountShell>
  );
}

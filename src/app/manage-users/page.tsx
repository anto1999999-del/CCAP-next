import type { Metadata } from "next";
import Link from "next/link";
import UserRow from "@/components/admin/UserRow";
import { adminOnly } from "@/lib/auth/guard";
import { listAccounts } from "@/lib/auth/accounts";

export const metadata: Metadata = {
  title: "Manage Users | Central Coast Auto Parts",
  robots: { index: false, follow: false },
};

export default async function ManageUsersPage() {
  const admin = await adminOnly("/manage-users");
  const accounts = await listAccounts();
  const admins = accounts.filter((account) => account.isAdmin).length;

  return (
    <div className="bg-surface min-h-screen px-4 py-12 text-white md:px-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
              Users
            </h1>
            <p className="mt-1 text-sm text-gray-400">
              {accounts.length} {accounts.length === 1 ? "account" : "accounts"},
              {" "}
              {admins} with admin access.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="rounded-full border border-gray-700 px-4 py-2 text-sm font-semibold text-gray-200 transition-colors hover:bg-gray-800"
          >
            Dashboard
          </Link>
        </header>

        <ul className="space-y-3">
          {accounts.map((account) => (
            <UserRow
              key={account.id}
              account={account}
              isSelf={account.id === admin.id}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}

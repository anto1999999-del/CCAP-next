import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import type { Account } from "@/lib/auth/accounts";

/**
 * The frame around every account and admin page.
 *
 * One sidebar, one heading, one content column, so moving between the
 * dashboard, the orders and a profile feels like moving inside one thing rather
 * than between five pages that happen to share a header.
 *
 * The admin links are absent, not disabled, for anyone who is not an admin.
 * Access is checked on the server on every page regardless; hiding them is a
 * courtesy, not the control.
 */

type Item = { href: string; label: string; adminOnly?: boolean };

const ITEMS: Item[] = [
  { href: "/dashboard", label: "Dashboard", adminOnly: true },
  { href: "/manage-orders", label: "Manage Orders", adminOnly: true },
  { href: "/manage-users", label: "Manage Users", adminOnly: true },
  { href: "/my-account", label: "My Profile" },
  { href: "/orders", label: "My Orders" },
];

export default function AccountShell({
  account,
  active,
  title,
  action,
  children,
}: {
  account: Account;
  /** The href of the page being shown, so its link reads as the current one. */
  active: string;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const items = ITEMS.filter((item) => account.isAdmin || !item.adminOnly);

  return (
    <div className="bg-admin min-h-screen text-white">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col lg:flex-row">
        <aside className="border-line w-full flex-shrink-0 border-b p-6 lg:w-72 lg:border-r lg:border-b-0 lg:p-8">
          <div className="lg:sticky lg:top-24">
            <p className="mb-1 text-xs font-semibold tracking-[0.22em] text-gray-500 uppercase">
              Signed in as
            </p>
            <p className="mb-8 truncate text-lg font-extrabold tracking-tight">
              {account.name}
            </p>

            <nav aria-label="Account">
              <ul className="space-y-1.5">
                {items.map((item) => {
                  const current = item.href === active;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={current ? "page" : undefined}
                        className={
                          current
                            ? "bg-brand block rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
                            : "block rounded-xl px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
                        }
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <form action={signOut} className="border-line mt-6 border-t pt-6">
              <button
                type="submit"
                className="w-full rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-gray-300 transition-colors hover:border-white/25 hover:text-white"
              >
                Sign out
              </button>
            </form>
          </div>
        </aside>

        <main className="min-w-0 flex-1 p-6 lg:p-10">
          <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">
              {title}
            </h1>
            {action}
          </header>

          {children}
        </main>
      </div>
    </div>
  );
}

/** A headline figure. Four of these sit across the top of most pages. */
export function StatCard({
  label,
  value,
  hint,
  tone = "plain",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "plain" | "brand" | "warn" | "good";
}) {
  const valueColour = {
    plain: "text-white",
    brand: "text-brand-text",
    warn: "text-amber-400",
    good: "text-emerald-400",
  }[tone];

  return (
    <div className="border-line bg-card rounded-2xl border p-5">
      <p className="text-[11px] font-semibold tracking-[0.18em] text-gray-500 uppercase">
        {label}
      </p>
      <p className={`mt-2 text-2xl font-extrabold tabular-nums ${valueColour}`}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

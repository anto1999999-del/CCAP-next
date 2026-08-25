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

type Item = { href: string; label: string };

/**
 * The sidebar, in three groups.
 *
 * Running the business, writing the website, and the admin's own account are
 * three different jobs, and seven links in one column made them look like one
 * list of equals. The headings are what let somebody find "Gallery" without
 * reading every entry.
 *
 * A customer sees only the last group, and it appears without its heading:
 * "My account" above two links, in a sidebar that has nothing else in it, is a
 * label for the whole page rather than for a section of it.
 */
type Group = { heading: string; adminOnly?: boolean; items: Item[] };

const GROUPS: Group[] = [
  {
    heading: "Manage",
    adminOnly: true,
    items: [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/manage-orders", label: "Orders" },
      { href: "/manage-users", label: "Users" },
    ],
  },
  {
    heading: "Content",
    adminOnly: true,
    items: [
      { href: "/manage-blog", label: "Blog" },
      { href: "/manage-gallery", label: "Gallery" },
    ],
  },
  {
    heading: "My account",
    items: [
      { href: "/my-account", label: "My Profile" },
      { href: "/orders", label: "My Orders" },
    ],
  },
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
  const groups = GROUPS.filter((group) => account.isAdmin || !group.adminOnly);

  return (
    <div className="bg-admin min-h-screen text-white">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col lg:flex-row">
        <aside className="border-line w-full flex-shrink-0 border-b p-6 lg:w-72 lg:border-r lg:border-b-0 lg:p-8">
          <div className="lg:sticky lg:top-24">
            <p className="mb-1 text-xs font-semibold tracking-[0.22em] text-gray-500 uppercase">
              Signed in as
            </p>
            <p className="mb-8 truncate text-lg font-extrabold tracking-tight">
              {account.name}
            </p>

            <nav aria-label="Account" className="space-y-6">
              {groups.map((group) => (
                <div key={group.heading}>
                  {groups.length > 1 && (
                    <p className="mb-2 px-4 text-[11px] font-semibold tracking-[0.22em] text-gray-600 uppercase">
                      {group.heading}
                    </p>
                  )}
                  <ul className="space-y-1.5">
                    {group.items.map((item) => {
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
                </div>
              ))}
            </nav>

            <form action={signOut} className="border-line mt-6 border-t pt-6">
              <button
                type="submit"
                className="w-full rounded-xl border-line border px-4 py-2.5 text-sm font-semibold text-gray-300 transition-colors hover:border-white/25 hover:text-white"
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

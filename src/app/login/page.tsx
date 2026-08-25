import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AuthForms from "@/components/auth/AuthForms";
import { currentAccount } from "@/lib/auth/accounts";
import { isConfigured } from "@/lib/db/mongo";

export const metadata: Metadata = {
  title: "Sign In | Central Coast Auto Parts",
  robots: { index: false, follow: false },
};

/*
  Rendered per request, not at build time.

  Whether accounts work depends on an environment variable, and the page reads
  it. Prerendered, that check runs during the build: a build without the
  variable bakes "accounts are not available" into static HTML, and setting the
  variable afterwards changes nothing until somebody rebuilds. It was doing
  exactly that. The early return also skips reading the session, which would
  otherwise have made the page dynamic on its own.
*/
export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  /*
    Accounts need the database. Without it the page would fail on the first
    query with a stack trace, so it says what is wrong instead. This is what a
    deployment missing MONGO_URI looks like, and it should be obvious.
  */
  if (!isConfigured()) return <AccountsUnavailable />;

  // Somebody already signed in has no business on a sign-in page.
  if (await currentAccount()) redirect("/my-account");

  const { next } = await searchParams;
  return <AuthForms next={next ?? "/my-account"} />;
}

function AccountsUnavailable() {
  return (
    <div className="bg-surface flex min-h-[60vh] flex-col items-center justify-center px-6 text-center text-white">
      <h1 className="mb-3 text-2xl font-bold">Accounts are not available</h1>
      <p className="max-w-md text-sm text-gray-400">
        This site is not connected to its database, so signing in is switched
        off. Everything else works.
      </p>
    </div>
  );
}

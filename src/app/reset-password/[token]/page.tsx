import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/ResetForms";
import { isResetTokenValid } from "@/lib/auth/reset";
import { isConfigured } from "@/lib/db/mongo";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Set A New Password | Central Coast Auto Parts",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * The page a reset link lands on.
 *
 * The link is checked before the form is shown, so somebody following a link
 * from an old email is told it has expired rather than typing a new password
 * twice and only then finding out.
 */
export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const usable = isConfigured() && (await isResetTokenValid(token));

  if (!usable) {
    return (
      <div className="bg-canvas px-4 py-14 text-white md:py-20">
        <div className="border-line bg-card mx-auto w-full max-w-md rounded-3xl border p-8 text-center sm:p-10">
          <h1 className="mb-3 text-2xl font-extrabold tracking-tight">
            That link has expired
          </h1>
          <p className="mb-8 text-sm text-gray-400">
            Reset links last an hour and work once. Ask for a fresh one, or call
            us on {site.contact.phone} and we will help.
          </p>
          <Link
            href="/forgot-password"
            className="bg-brand hover:bg-brand-hover block w-full rounded-xl px-4 py-3.5 font-bold text-white transition-colors"
          >
            Send me a new link
          </Link>
        </div>
      </div>
    );
  }

  return <ResetPasswordForm token={token} />;
}

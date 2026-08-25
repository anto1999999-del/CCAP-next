import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AccountShell from "@/components/account/AccountShell";
import PostEditor from "@/components/admin/PostEditor";
import { adminOnly } from "@/lib/auth/guard";
import { postById } from "@/lib/content/store";

export const metadata: Metadata = {
  title: "Edit Article | Central Coast Auto Parts",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * One article, or a blank one.
 *
 * `/manage-blog/new` is the blank form. It is a real address rather than a
 * dialog so the browser's back button works and a half-written article survives
 * a mistyped click, and so the URL changes to the article's own once it is
 * saved.
 */
export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await adminOnly("/manage-blog");
  const { id } = await params;

  const post = id === "new" ? null : await postById(id);
  if (id !== "new" && !post) notFound();

  return (
    <AccountShell
      account={admin}
      active="/manage-blog"
      title={post ? "Edit article" : "New article"}
      action={
        <Link
          href="/manage-blog"
          className="border-line rounded-xl border px-4 py-2.5 text-sm font-semibold text-gray-300 transition-colors hover:border-white/30 hover:text-white"
        >
          Back to all articles
        </Link>
      }
    >
      <PostEditor post={post} />
    </AccountShell>
  );
}

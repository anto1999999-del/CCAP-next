import type { Metadata } from "next";
import Link from "next/link";
import AccountShell, { StatCard } from "@/components/account/AccountShell";
import ContentTable, { type ContentRow } from "@/components/admin/ContentTable";
import { adminOnly } from "@/lib/auth/guard";
import { allPosts } from "@/lib/content/store";

export const metadata: Metadata = {
  title: "Manage Blog | Central Coast Auto Parts",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Every article, drafts included.
 *
 * Filtered in memory rather than in the database: there are under a hundred
 * articles and there will be under a hundred for years. A query per filter would
 * be more code for no difference anybody could measure.
 */
export default async function ManageBlogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const admin = await adminOnly("/manage-blog");
  const params = await searchParams;

  const search = params.q?.trim().toLowerCase() ?? "";
  const status =
    params.status === "draft" || params.status === "published"
      ? params.status
      : "all";

  const posts = await allPosts();

  const rows: ContentRow[] = posts
    .filter((post) => status === "all" || post.status === status)
    .filter(
      (post) =>
        !search ||
        post.title.toLowerCase().includes(search) ||
        post.slug.includes(search),
    )
    .map((post) => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      status: post.status,
      updatedAt: post.updatedAt,
      thumbnail: post.featuredImage?.url ?? null,
      detail: post.tags.slice(0, 3).join(", "),
    }));

  const published = posts.filter((post) => post.status === "published").length;

  const tab = (value: string, label: string) => {
    const query = new URLSearchParams();
    if (params.q) query.set("q", params.q);
    if (value !== "all") query.set("status", value);
    const suffix = query.toString();

    return (
      <Link
        key={value}
        href={suffix ? `/manage-blog?${suffix}` : "/manage-blog"}
        aria-current={status === value ? "page" : undefined}
        className={
          status === value
            ? "bg-brand rounded-xl px-4 py-2 text-sm font-semibold text-white"
            : "border-line rounded-xl border px-4 py-2 text-sm font-semibold text-gray-300 transition-colors hover:border-white/30 hover:text-white"
        }
      >
        {label}
      </Link>
    );
  };

  return (
    <AccountShell
      account={admin}
      active="/manage-blog"
      title="Blog"
      action={
        <Link
          href="/manage-blog/new"
          className="bg-brand hover:bg-brand-hover rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-colors"
        >
          Write an article
        </Link>
      }
    >
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Articles" value={posts.length.toLocaleString()} />
        <StatCard
          label="Published"
          value={published.toLocaleString()}
          tone="good"
          hint="Live on the site"
        />
        <StatCard
          label="Drafts"
          value={(posts.length - published).toLocaleString()}
          tone="warn"
          hint="Nobody can see these"
        />
      </div>

      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex flex-wrap gap-2">
          {tab("all", "All")}
          {tab("published", "Published")}
          {tab("draft", "Drafts")}
        </div>

        <form
          action="/manage-blog"
          method="GET"
          className="flex flex-1 gap-3 lg:justify-end"
        >
          {status !== "all" && (
            <input type="hidden" name="status" value={status} />
          )}
          <label htmlFor="blog-search" className="sr-only">
            Search articles
          </label>
          <input
            id="blog-search"
            name="q"
            type="search"
            defaultValue={params.q ?? ""}
            placeholder="Search by title or address"
            className="focus:border-brand border-line min-w-0 flex-1 rounded-xl border bg-[#0b0b0d] px-4 py-2.5 text-sm text-white placeholder-gray-600 transition-colors focus:outline-none lg:max-w-sm"
          />
          <button
            type="submit"
            className="border-line rounded-xl border px-5 py-2.5 text-sm font-semibold text-gray-200 transition-colors hover:border-white/30"
          >
            Search
          </button>
        </form>
      </div>

      <ContentTable
        rows={rows}
        kind="post"
        emptyMessage={
          search
            ? "No articles match that search."
            : status === "draft"
              ? "No drafts. Everything written is published."
              : "No articles yet. Write the first one."
        }
      />
    </AccountShell>
  );
}

"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StatusPill } from "./EditorParts";
import { publishPost, publishVehicle } from "@/app/actions/content";
import type { ContentStatus } from "@/lib/content/schema";

/**
 * The list of articles, or of vehicles.
 *
 * One component for both, because the two lists do the same job: show what
 * exists, say whether the public can see it, and let somebody change that
 * without opening the editor. The only real difference is where a row links to
 * and which action publishes it.
 *
 * Publishing from the list is deliberate. Taking a car off the gallery because
 * it has been stripped should be one click from the list, not four clicks
 * through an editor.
 */

export type ContentRow = {
  id: string;
  title: string;
  slug: string;
  status: ContentStatus;
  updatedAt: string | null;
  /** The cover shot, so the list is scannable by picture as well as by name. */
  thumbnail: string | null;
  /** "12 photos", or the article's tags. Whatever the row is worth saying. */
  detail: string;
};

function when(value: string | null): string {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ContentTable({
  rows,
  kind,
  emptyMessage,
}: {
  rows: ContentRow[];
  kind: "post" | "vehicle";
  emptyMessage: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [working, setWorking] = useState<string | null>(null);

  const editBase = kind === "post" ? "/manage-blog" : "/manage-gallery";
  const publicBase = kind === "post" ? "/blog" : "/gallery";

  function toggle(row: ContentRow) {
    const next = row.status !== "published";
    setWorking(row.id);

    start(async () => {
      if (kind === "post") await publishPost(row.id, next);
      else await publishVehicle(row.id, next);

      setWorking(null);
      router.refresh();
    });
  }

  if (rows.length === 0) {
    return (
      <div className="border-line bg-card rounded-2xl border p-10 text-center">
        <p className="text-sm text-gray-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="border-line bg-card overflow-hidden rounded-2xl border">
      <div className="border-line hidden border-b px-5 py-3 text-xs font-semibold tracking-wider text-gray-500 uppercase md:grid md:grid-cols-[64px_minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,0.8fr)_auto] md:items-center md:gap-4">
        <span />
        <span>Title</span>
        <span>Status</span>
        <span>Updated</span>
        <span className="text-right">Actions</span>
      </div>

      <ul className="divide-line divide-y">
        {rows.map((row) => (
          <li
            key={row.id}
            className="grid grid-cols-[56px_minmax(0,1fr)] items-center gap-4 px-4 py-4 transition-colors hover:bg-white/[0.02] md:grid-cols-[64px_minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,0.8fr)_auto] md:px-5"
          >
            <div className="border-line h-14 w-14 overflow-hidden rounded-lg border bg-[#0b0b0d] md:h-16 md:w-16">
              {row.thumbnail ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={row.thumbnail}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full items-center justify-center text-[10px] text-gray-600">
                  No photo
                </span>
              )}
            </div>

            <div className="min-w-0">
              <Link
                href={`${editBase}/${row.id}`}
                className="hover:text-brand-text block truncate text-sm font-semibold text-white transition-colors"
              >
                {row.title || "Untitled"}
              </Link>
              <p className="mt-0.5 truncate text-xs text-gray-500">
                {publicBase}/{row.slug}
                {row.detail && ` · ${row.detail}`}
              </p>

              {/* Repeated for narrow screens, where the columns collapse away. */}
              <div className="mt-2 flex items-center gap-3 md:hidden">
                <StatusPill status={row.status} />
                <span className="text-xs text-gray-500">
                  {when(row.updatedAt)}
                </span>
              </div>
            </div>

            <div className="hidden md:block">
              <StatusPill status={row.status} />
            </div>

            <span className="hidden text-xs text-gray-500 tabular-nums md:block">
              {when(row.updatedAt)}
            </span>

            <div className="col-span-2 flex flex-wrap items-center gap-2 md:col-span-1 md:justify-end">
              {row.status === "published" && (
                <Link
                  href={`${publicBase}/${row.slug}`}
                  target="_blank"
                  className="border-line rounded-lg border px-3 py-1.5 text-xs font-semibold text-gray-300 transition-colors hover:border-white/30 hover:text-white"
                >
                  View
                </Link>
              )}
              <Link
                href={`${editBase}/${row.id}`}
                className="border-line rounded-lg border px-3 py-1.5 text-xs font-semibold text-gray-200 transition-colors hover:border-white/30"
              >
                Edit
              </Link>
              <button
                type="button"
                onClick={() => toggle(row)}
                disabled={pending && working === row.id}
                className={
                  row.status === "published"
                    ? "border-line rounded-lg border px-3 py-1.5 text-xs font-semibold text-amber-400 transition-colors hover:border-amber-400/40 disabled:opacity-60"
                    : "bg-brand hover:bg-brand-hover rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-60"
                }
              >
                {working === row.id
                  ? "Working..."
                  : row.status === "published"
                    ? "Unpublish"
                    : "Publish"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

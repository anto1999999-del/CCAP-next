import type { Metadata } from "next";
import Link from "next/link";
import AccountShell, { StatCard } from "@/components/account/AccountShell";
import ContentTable, { type ContentRow } from "@/components/admin/ContentTable";
import Pagination from "@/components/layout/Pagination";
import { adminOnly } from "@/lib/auth/guard";
import { allVehicles } from "@/lib/content/store";

export const metadata: Metadata = {
  title: "Manage Gallery | Central Coast Auto Parts",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const PER_PAGE = 20;

export default async function ManageGalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const admin = await adminOnly("/manage-gallery");
  const params = await searchParams;

  const search = params.q?.trim().toLowerCase() ?? "";
  const status =
    params.status === "draft" || params.status === "published"
      ? params.status
      : "all";

  const vehicles = await allVehicles();

  const matches: ContentRow[] = vehicles
    .filter((vehicle) => status === "all" || vehicle.status === status)
    .filter(
      (vehicle) =>
        !search ||
        vehicle.title.toLowerCase().includes(search) ||
        vehicle.make.toLowerCase().includes(search) ||
        vehicle.model.toLowerCase().includes(search) ||
        vehicle.slug.includes(search),
    )
    .map((vehicle) => ({
      id: vehicle.id,
      title: vehicle.title,
      slug: vehicle.slug,
      status: vehicle.status,
      updatedAt: vehicle.updatedAt,
      thumbnail: vehicle.photos[0]?.url ?? null,
      detail:
        vehicle.photos.length === 1
          ? "1 photo"
          : `${vehicle.photos.length} photos`,
    }));

  const published = vehicles.filter(
    (vehicle) => vehicle.status === "published",
  ).length;

  const photos = vehicles.reduce(
    (total, vehicle) => total + vehicle.photos.length,
    0,
  );

  /*
    Twenty a screen. The list was every row at once, which on the blog meant
    eighty-seven of them and a page nobody scrolled to the end of.
  */
  const pageCount = Math.max(1, Math.ceil(matches.length / PER_PAGE));
  const page = Math.min(Math.max(1, Number(params.page) || 1), pageCount);
  const rows = matches.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  /** Keeps the search and the filter while moving between pages. */
  const hrefForPage = (target: number) => {
    const query = new URLSearchParams();
    if (params.q) query.set("q", params.q);
    if (status !== "all") query.set("status", status);
    if (target > 1) query.set("page", String(target));
    const suffix = query.toString();
    return suffix ? `/manage-gallery?${suffix}` : "/manage-gallery";
  };

  const tab = (value: string, label: string) => {
    const query = new URLSearchParams();
    if (params.q) query.set("q", params.q);
    if (value !== "all") query.set("status", value);
    const suffix = query.toString();

    return (
      <Link
        key={value}
        href={suffix ? `/manage-gallery?${suffix}` : "/manage-gallery"}
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
      active="/manage-gallery"
      title="Gallery"
      action={
        <Link
          href="/manage-gallery/new"
          className="bg-brand hover:bg-brand-hover rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-colors"
        >
          Add a vehicle
        </Link>
      }
    >
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Vehicles" value={vehicles.length.toLocaleString()} />
        <StatCard
          label="Published"
          value={published.toLocaleString()}
          tone="good"
          hint="Showing in the gallery"
        />
        <StatCard
          label="Drafts"
          value={(vehicles.length - published).toLocaleString()}
          tone="warn"
          hint="Nobody can see these"
        />
        <StatCard label="Photos" value={photos.toLocaleString()} />
      </div>

      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex flex-wrap gap-2">
          {tab("all", "All")}
          {tab("published", "Published")}
          {tab("draft", "Drafts")}
        </div>

        <form
          action="/manage-gallery"
          method="GET"
          className="flex flex-1 gap-3 lg:justify-end"
        >
          {status !== "all" && (
            <input type="hidden" name="status" value={status} />
          )}
          <label htmlFor="gallery-search" className="sr-only">
            Search vehicles
          </label>
          <input
            id="gallery-search"
            name="q"
            type="search"
            defaultValue={params.q ?? ""}
            placeholder="Search by make, model or title"
            className="focus:border-brand border-line min-w-0 flex-1 rounded-xl border bg-field px-4 py-2.5 text-sm text-white placeholder-gray-600 transition-colors focus:outline-none lg:max-w-sm"
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
        kind="vehicle"
        emptyMessage={
          search
            ? "No vehicles match that search."
            : status === "draft"
              ? "No drafts. Every vehicle added is published."
              : "No vehicles yet. Add the first one."
        }
      />

      <Pagination
        page={page}
        pageCount={pageCount}
        totalResults={matches.length}
        shown={rows.length}
        perPage={PER_PAGE}
        noun="vehicles"
        label="Vehicle pages"
        hrefForPage={hrefForPage}
      />
    </AccountShell>
  );
}

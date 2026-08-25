"use client";

import { useMemo, useState } from "react";
import VehicleCard from "./VehicleCard";
import SectionHeading from "@/components/layout/SectionHeading";
import { site } from "@/lib/site";
import type { GalleryMake, GalleryVehicle } from "@/lib/blog/gallery";

/**
 * The vehicle gallery, filterable by make.
 *
 * The WordPress gallery showed six vehicles a page across five numbered pages,
 * with no way to narrow it down: someone after a Kia part had to click through
 * every page looking for one. Here the filter comes first and the paging
 * applies to whatever the filter left, so picking Kia and then turning the page
 * stays inside the Kias.
 *
 * Both are client-side on purpose. Every vehicle is already in the page,
 * server-rendered, so crawlers see all of them whatever page a visitor is
 * looking at; filtering and paging in the browser avoid a round trip and keep
 * every vehicle indexable. If the yard ever holds hundreds, this becomes a
 * server-side filter with the make and the page in the URL.
 */

/** Divides into two and three columns evenly, so no row is left short. */
const PER_PAGE = 12;
export default function GalleryGrid({
  vehicles,
  makes,
}: {
  vehicles: readonly GalleryVehicle[];
  makes: readonly GalleryMake[];
}) {
  const [activeMake, setActiveMake] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  /**
   * Choosing a make goes back to page one.
   *
   * Standing on page three of the Hyundais and then picking Kia, which has
   * five, would otherwise show an empty page three and look broken.
   */
  function chooseMake(slug: string | null) {
    setActiveMake(slug);
    setPage(1);
  }

  const shown = useMemo(
    () =>
      activeMake
        ? vehicles.filter((vehicle) => vehicle.makeSlug === activeMake)
        : vehicles,
    [vehicles, activeMake],
  );

  const pageCount = Math.max(1, Math.ceil(shown.length / PER_PAGE));
  const current = Math.min(page, pageCount);
  const first = (current - 1) * PER_PAGE + 1;
  const onThisPage = shown.slice(first - 1, first - 1 + PER_PAGE);

  return (
    <>
      <SectionHeading
        className="mb-10"
        title="Cars we have parted out"
        intro="Pick a make to narrow it down. This is a sample of our work, not the full list of what we can supply."
      />

      <div
        role="group"
        aria-label="Filter vehicles by make"
        className="mb-10 flex flex-wrap justify-center gap-2"
      >
        <FilterChip
          label="All makes"
          count={vehicles.length}
          active={activeMake === null}
          onClick={() => chooseMake(null)}
        />
        {makes.map((make) => (
          <FilterChip
            key={make.slug}
            label={make.name}
            count={make.count}
            active={activeMake === make.slug}
            onClick={() => chooseMake(make.slug)}
          />
        ))}
      </div>

      <p aria-live="polite" className="sr-only">
        Showing {onThisPage.length} of {shown.length} vehicles
        {activeMake ? " for that make" : ""}
      </p>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:gap-8 lg:grid-cols-3">
        {onThisPage.map((vehicle) => (
          <VehicleCard key={vehicle.slug} vehicle={vehicle} />
        ))}
      </div>

      {pageCount > 1 && (
        <nav
          aria-label="Gallery pages"
          className="mt-10 flex flex-col items-center gap-4"
        >
          <p className="text-sm text-gray-400">
            Showing {first} to {first + onThisPage.length - 1} of {shown.length}{" "}
            vehicles
          </p>
          <ul className="flex flex-wrap items-center justify-center gap-2">
            {Array.from({ length: pageCount }, (_, index) => index + 1).map(
              (number) => (
                <li key={number}>
                  <button
                    type="button"
                    onClick={() => setPage(number)}
                    aria-current={number === current ? "true" : undefined}
                    className={
                      number === current
                        ? "bg-brand block min-w-10 rounded-xl px-3 py-2 text-center text-sm font-semibold text-white"
                        : "border-line block min-w-10 rounded-xl border px-3 py-2 text-center text-sm font-semibold text-gray-300 transition-colors hover:border-white/25 hover:text-white"
                    }
                  >
                    {number}
                  </button>
                </li>
              ),
            )}
          </ul>
        </nav>
      )}

      {shown.length === 0 && (
        <p className="py-12 text-center text-gray-400">
          No photos of that make here yet. We part out far more than we
          photograph, so call us on{" "}
          <span className="text-brand-text font-semibold">
            {site.contact.phone}
          </span>{" "}
          and we will check for you.
        </p>
      )}
    </>
  );
}

function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
        active
          ? "border-brand bg-brand text-white"
          : "border-white/15 bg-white/5 text-gray-400 hover:border-white/30 hover:text-white"
      }`}
    >
      {label}
      <span className={active ? "ml-1.5 opacity-80" : "ml-1.5 text-gray-500"}>
        {count}
      </span>
    </button>
  );
}

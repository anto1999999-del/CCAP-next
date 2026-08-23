"use client";

import { useMemo, useState } from "react";
import VehicleCard from "./VehicleCard";
import { site } from "@/lib/site";
import type { GalleryMake, GalleryVehicle } from "@/lib/blog/gallery";

/**
 * The vehicle gallery, filterable by make.
 *
 * The WordPress gallery showed six vehicles a page across five numbered pages,
 * with no way to narrow it down, someone after a Kia part had to click through
 * every page looking for one. Every vehicle is rendered here and filtering is
 * instant, because 26 items is far too few to justify paging.
 *
 * The filter is client-side on purpose. The vehicles are already in the page
 * (server-rendered, so crawlers see all of them), and filtering in the browser
 * avoids a round trip and keeps every vehicle indexable. If the yard ever holds
 * hundreds, this becomes a server-side filter with the make in the URL.
 */
export default function GalleryGrid({
  vehicles,
  makes,
}: {
  vehicles: readonly GalleryVehicle[];
  makes: readonly GalleryMake[];
}) {
  const [activeMake, setActiveMake] = useState<string | null>(null);

  const shown = useMemo(
    () =>
      activeMake
        ? vehicles.filter((vehicle) => vehicle.makeSlug === activeMake)
        : vehicles,
    [vehicles, activeMake],
  );

  return (
    <>
      <div className="mb-10 text-center">
        <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">
          Cars we have parted out
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-white/70 md:text-base">
          Pick a make to narrow it down. This is a sample of our work, not the
          full list of what we can supply.
        </p>
        <div className="bg-brand mx-auto mt-4 h-[3px] w-14 rounded-full" />
      </div>

      <div
        role="group"
        aria-label="Filter vehicles by make"
        className="mb-10 flex flex-wrap justify-center gap-2"
      >
        <FilterChip
          label="All makes"
          count={vehicles.length}
          active={activeMake === null}
          onClick={() => setActiveMake(null)}
        />
        {makes.map((make) => (
          <FilterChip
            key={make.slug}
            label={make.name}
            count={make.count}
            active={activeMake === make.slug}
            onClick={() => setActiveMake(make.slug)}
          />
        ))}
      </div>

      <p aria-live="polite" className="sr-only">
        Showing {shown.length} of {vehicles.length} vehicles
      </p>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:gap-8 lg:grid-cols-3">
        {shown.map((vehicle) => (
          <VehicleCard key={vehicle.slug} vehicle={vehicle} />
        ))}
      </div>

      {shown.length === 0 && (
        <p className="py-12 text-center text-white/60">
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
          : "border-white/15 bg-white/5 text-white/70 hover:border-white/30 hover:text-white"
      }`}
    >
      {label}
      <span className={active ? "ml-1.5 opacity-80" : "ml-1.5 text-white/40"}>
        {count}
      </span>
    </button>
  );
}

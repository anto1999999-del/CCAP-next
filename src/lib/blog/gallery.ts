import "server-only";
import {
  publishedVehicleSlugs,
  publishedVehicles,
  vehicleBySlug,
} from "../content/store";
import { renderBody } from "../content/render";
import { toSlug, type Vehicle } from "../content/schema";

/**
 * The salvage vehicle gallery.
 *
 * These were WordPress posts filed under a "Gallery" category, and the year,
 * make and model had to be parsed back out of titles like
 * "2019 KIA CERATO 2.0 SEDAN". They are their own records now with their own
 * fields, so nothing is guessed: what the admin typed is what the filter uses.
 *
 * The parsing that used to live here moved into the importer, which ran once.
 *
 * Everything here is published vehicles only. A car that has been stripped is
 * unpublished rather than deleted, so its page and its photographs stay in the
 * yard's own records.
 */

export type GalleryPhoto = {
  url: string;
  width: number | null;
  height: number | null;
  alt: string;
};

export type GalleryVehicle = {
  slug: string;
  /** Full title as published, e.g. "2019 Kia Cerato 2.0 Sedan". */
  title: string;
  year: number | null;
  make: string | null;
  makeSlug: string | null;
  model: string;
  image: GalleryPhoto | null;
  addedAt: string | null;
};

/** A vehicle plus everything only its own page needs. */
export type GalleryVehicleDetail = GalleryVehicle & {
  /** Every photograph of this vehicle, cover shot first. */
  photos: GalleryPhoto[];
  /** The write-up, rendered and sanitised. */
  bodyHtml: string;
};

export type GalleryMake = { name: string; slug: string; count: number };

function toGalleryVehicle(vehicle: Vehicle): GalleryVehicle {
  const year = Number.parseInt(vehicle.year, 10);
  const make = vehicle.make.trim();

  return {
    slug: vehicle.slug,
    title: vehicle.title,
    // A year that is not a plain number sorts and filters as no year at all,
    // which is better than a NaN reaching a template.
    year: Number.isFinite(year) ? year : null,
    make: make || null,
    makeSlug: make ? toSlug(make) : null,
    model: vehicle.model,
    image: vehicle.photos[0] ?? null,
    addedAt: vehicle.publishedAt,
  };
}

/** Every published vehicle, newest first. */
export async function listVehicles(): Promise<GalleryVehicle[]> {
  return (await publishedVehicles()).map(toGalleryVehicle);
}

/** The makes actually present, with counts, for the filter row. */
export async function listMakes(): Promise<GalleryMake[]> {
  const counts = new Map<string, GalleryMake>();

  for (const vehicle of await listVehicles()) {
    if (!vehicle.make || !vehicle.makeSlug) continue;

    const existing = counts.get(vehicle.makeSlug);
    if (existing) existing.count += 1;
    else
      counts.set(vehicle.makeSlug, {
        name: vehicle.make,
        slug: vehicle.makeSlug,
        count: 1,
      });
  }

  return [...counts.values()].sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name),
  );
}

/** Every vehicle slug, for `generateStaticParams`. */
export async function listVehicleSlugs(): Promise<string[]> {
  return publishedVehicleSlugs();
}

export async function getVehicle(
  slug: string,
): Promise<GalleryVehicleDetail | null> {
  const vehicle = await vehicleBySlug(slug);
  if (!vehicle) return null;

  return {
    ...toGalleryVehicle(vehicle),
    photos: vehicle.photos,
    bodyHtml: renderBody(vehicle.body, vehicle.bodyFormat),
  };
}

/** Other vehicles for the foot of a vehicle page, same make first. */
export async function getRelatedVehicles(
  slug: string,
  limit = 3,
): Promise<GalleryVehicle[]> {
  const all = await listVehicles();
  const current = all.find((vehicle) => vehicle.slug === slug);
  if (!current) return [];

  const others = all.filter((vehicle) => vehicle.slug !== slug);
  const sameMake = others.filter(
    (vehicle) => vehicle.makeSlug === current.makeSlug,
  );
  const rest = others.filter((vehicle) => vehicle.makeSlug !== current.makeSlug);

  return [...sameMake, ...rest].slice(0, limit);
}

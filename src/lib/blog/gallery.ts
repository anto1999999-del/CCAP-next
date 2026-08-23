import "server-only";
import { cleanPostHtml, rewriteImageUrl } from "./html";
import { listPosts, type BlogPost } from "./repository";

/**
 * The salvage vehicle gallery.
 *
 * In WordPress these are ordinary posts filed under the "Gallery" category:
 * 26 of them, against 87 real articles. Nothing separated the two, so both were
 * about to appear in the same list. They are different things and belong on
 * different pages.
 *
 * Each entry is titled "YEAR MAKE MODEL VARIANT", for example
 * "2019 KIA CERATO 2.0 SEDAN". Year and make are parsed out of that so the
 * gallery can be filtered by make, which the WordPress gallery could not do:
 * it was six vehicles a page across five pages of numbered links.
 *
 * Parsing the title is a migration measure, not the long-term plan. Once
 * vehicles are added through the admin, year, make and model become real fields
 * and `fromTitle` becomes the fallback for the 26 that came from WordPress.
 */

/**
 * Makes seen in the yard. Checked against the export: all 26 vehicles match one
 * of these. Multi-word makes come first so "Great Wall" is not read as a model.
 */
const KNOWN_MAKES = [
  "Great Wall",
  "Land Rover",
  "Alfa Romeo",
  "Mercedes-Benz",
  "Mercedes",
  "Volkswagen",
  "Mitsubishi",
  "Chrysler",
  "Hyundai",
  "Peugeot",
  "Renault",
  "Subaru",
  "Suzuki",
  "Holden",
  "Toyota",
  "Nissan",
  "Skoda",
  "Lexus",
  "Honda",
  "Mazda",
  "Isuzu",
  "Haval",
  "Audi",
  "Jeep",
  "Ford",
  "BMW",
  "Kia",
  "LDV",
  "MG",
] as const;

export type GalleryPhoto = {
  url: string;
  width: number | null;
  height: number | null;
  alt: string;
};

export type GalleryVehicle = {
  slug: string;
  /** Full title as published, e.g. "2019 KIA CERATO 2.0 SEDAN". */
  title: string;
  year: number | null;
  make: string | null;
  makeSlug: string | null;
  /** What is left of the title after the year and make. */
  model: string;
  image: GalleryPhoto | null;
  addedAt: string | null;
};

/** A vehicle plus everything only its own page needs. */
export type GalleryVehicleDetail = GalleryVehicle & {
  /** Every photograph taken of this vehicle, cover shot first. */
  photos: GalleryPhoto[];
  /** The written description, with the photographs taken out of it. */
  bodyHtml: string;
};

export type GalleryMake = { name: string; slug: string; count: number };

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Pull year, make and model out of a published vehicle title. */
function fromTitle(title: string): Pick<GalleryVehicle, "year" | "make" | "makeSlug" | "model"> {
  const yearMatch = title.match(/^((?:19|20)\d{2})\s+(.*)$/);
  const year = yearMatch ? Number(yearMatch[1]) : null;
  const rest = yearMatch ? yearMatch[2] : title;

  const make =
    KNOWN_MAKES.find((candidate) =>
      new RegExp(`\\b${candidate.replace(/[-\s]/g, "[-\\s]")}\\b`, "i").test(rest),
    ) ?? null;

  const model = make
    ? rest.replace(new RegExp(`\\b${make.replace(/[-\s]/g, "[-\\s]")}\\b`, "i"), "").trim()
    : rest.trim();

  return {
    year,
    // Title case, so "KIA" and "Kia" do not become two different filters.
    make: make ?? null,
    makeSlug: make ? slugify(make) : null,
    model,
  };
}

function toVehicle(post: BlogPost): GalleryVehicle {
  return {
    slug: post.slug,
    title: post.title,
    ...fromTitle(post.title),
    image: post.featuredImage,
    addedAt: post.publishedAt,
  };
}

/** Every vehicle, newest first. */
export function listVehicles(): GalleryVehicle[] {
  return listPosts()
    .filter((post) => post.categorySlug === "gallery")
    .map(toVehicle);
}

/** The makes actually present, with counts, for the filter row. */
export function listMakes(): GalleryMake[] {
  const counts = new Map<string, GalleryMake>();

  for (const vehicle of listVehicles()) {
    if (!vehicle.make || !vehicle.makeSlug) continue;
    const existing = counts.get(vehicle.makeSlug);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(vehicle.makeSlug, {
        name: vehicle.make,
        slug: vehicle.makeSlug,
        count: 1,
      });
    }
  }

  return [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/**
 * Pull the photographs out of a WordPress post body.
 *
 * Each vehicle was published as five `<figure><img></figure>` blocks with the
 * description between them. Rendering that HTML as-is would give five
 * full-width images stacked down the page, which is what made the WordPress
 * gallery so hard to look at. They are extracted here instead, so the page can
 * lay them out properly and the prose can stand on its own.
 *
 * `srcset` is ignored deliberately: it lists the same photograph at WordPress's
 * generated sizes, and next/image produces its own responsive sources.
 */
function extractPhotos(html: string): GalleryPhoto[] {
  const photos: GalleryPhoto[] = [];
  const seen = new Set<string>();

  for (const tag of html.match(/<img\b[^>]*>/gi) ?? []) {
    const src = tag.match(/\ssrc="([^"]+)"/i)?.[1];
    if (!src) continue;

    const url = rewriteImageUrl(src);
    if (seen.has(url)) continue;
    seen.add(url);

    const width = Number(tag.match(/\swidth="(\d+)"/i)?.[1]);
    const height = Number(tag.match(/\sheight="(\d+)"/i)?.[1]);

    photos.push({
      url,
      width: Number.isFinite(width) ? width : null,
      height: Number.isFinite(height) ? height : null,
      alt: tag.match(/\salt="([^"]*)"/i)?.[1] ?? "",
    });
  }

  return photos;
}

/** The description on its own, with the figures removed. */
function extractBody(html: string): string {
  const withoutFigures = html
    .replace(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi, "")
    .replace(/<img\b[^>]*>/gi, "");

  return cleanPostHtml(withoutFigures);
}

/** Every vehicle slug, for `generateStaticParams`. */
export function listVehicleSlugs(): string[] {
  return listVehicles().map((vehicle) => vehicle.slug);
}

/** One vehicle with its photographs and description, or null if there is no such slug. */
export function getVehicle(slug: string): GalleryVehicleDetail | null {
  const post = listPosts().find(
    (candidate) => candidate.slug === slug && candidate.categorySlug === "gallery",
  );
  if (!post) return null;

  const photos = extractPhotos(post.contentHtml);
  const cover = post.featuredImage
    ? { ...post.featuredImage, url: rewriteImageUrl(post.featuredImage.url) }
    : null;

  return {
    ...toVehicle(post),
    // The cover shot leads, and is not repeated further down the strip.
    photos: cover
      ? [cover,
      ...photos.filter((photo) => photo.url !== cover.url)]
      : photos,
    bodyHtml: extractBody(post.contentHtml),
  };
}

/** Other vehicles to show at the foot of a vehicle page, same make first. */
export function getRelatedVehicles(slug: string, limit = 3): GalleryVehicle[] {
  const all = listVehicles();
  const current = all.find((vehicle) => vehicle.slug === slug);
  if (!current) return [];

  const others = all.filter((vehicle) => vehicle.slug !== slug);
  const sameMake = others.filter((vehicle) => vehicle.makeSlug === current.makeSlug);
  const rest = others.filter((vehicle) => vehicle.makeSlug !== current.makeSlug);

  return [...sameMake,
  ...rest].slice(0, limit);
}

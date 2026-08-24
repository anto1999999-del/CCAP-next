import type { MetadataRoute } from "next";
import { listArticles } from "@/lib/blog/repository";
import { listVehicles } from "@/lib/blog/gallery";
import { partPath } from "@/lib/parts/identity";
import {
  PARTS_PER_FILE,
  sellableParts,
  sitemapFileCount,
} from "@/lib/seo/sitemap-files";
import { PART_CATEGORIES } from "@/lib/content/part-categories";
import { site } from "@/lib/site";

/**
 * The sitemap.
 *
 * The live one lists twelve URLs and has not kept up: it is missing the parts
 * hub, the terms page, and everything that used to live on the blog subdomain.
 * This is generated from the same data the pages are built from, so it cannot
 * drift out of date the way a hand-written file does.
 *
 * It is split into files. The first holds the pages that rarely change; the
 * rest hold the catalogue, which is 24,000 priced parts and would otherwise be
 * one enormous file. Next serves them as /sitemap/0.xml, /sitemap/1.xml and so
 * on, with an index at /sitemap.xml.
 */

export async function generateSitemaps() {
  // File 0 is the site itself; the rest are catalogue pages.
  const count = await sitemapFileCount();
  return Array.from({ length: count }, (_, id) => ({ id }));
}

/**
 * `id` arrives as a promise in this version of Next, not as a number. Comparing
 * the promise itself is always false, which silently serves the same file for
 * every chunk: awaiting it is not optional.
 */
export default async function sitemap(props: {
  id: Promise<string>;
}): Promise<MetadataRoute.Sitemap> {
  const id = Number(await props.id);

  if (id > 0) {
    const parts = await sellableParts();
    const start = (id - 1) * PARTS_PER_FILE;

    return parts.slice(start, start + PARTS_PER_FILE).map((part) => ({
      url: `${site.url}${partPath(part)}`,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    }));
  }

  const pages: MetadataRoute.Sitemap = [
    { url: `${site.url}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${site.url}/products`, changeFrequency: "daily", priority: 0.9 },
    { url: `${site.url}/parts`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${site.url}/about`, changeFrequency: "yearly", priority: 0.6 },
    { url: `${site.url}/contact`, changeFrequency: "yearly", priority: 0.6 },
    { url: `${site.url}/sellyourcar`, changeFrequency: "yearly", priority: 0.7 },
    {
      url: `${site.url}/terms-conditions`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    { url: `${site.url}/blog`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${site.url}/gallery`, changeFrequency: "weekly", priority: 0.7 },
  ];

  const categories = PART_CATEGORIES.map((category) => ({
    url: `${site.url}/parts/${category.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const articles = listArticles().map((post) => ({
    url: `${site.url}/blog/${post.slug}`,
    lastModified: post.updatedAt ?? post.publishedAt ?? undefined,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  const vehicles = listVehicles().map((vehicle) => ({
    url: `${site.url}/gallery/${vehicle.slug}`,
    lastModified: vehicle.addedAt ?? undefined,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  return [...pages, ...categories, ...articles, ...vehicles];
}

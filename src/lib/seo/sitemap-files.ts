import "server-only";
import { hasPrice } from "../parts/arrange";
import { loadCatalog } from "../parts/catalog";
import { site } from "../site";

/**
 * How the sitemap is split, and where the pieces live.
 *
 * Shared by the sitemap itself and by robots.txt, because the two have to
 * agree: robots names every file, and there is no index at /sitemap.xml to name
 * instead. Next serves a chunked sitemap as /sitemap/0.xml, /sitemap/1.xml and
 * so on, and does not produce an index for them, so pointing robots at
 * /sitemap.xml sends every crawler to a 404.
 */

/** Well under Google's 50,000 URL limit, and small enough to fetch quickly. */
export const PARTS_PER_FILE = 10_000;

/**
 * Only parts with a price.
 *
 * An unpriced part's page says "contact for price" and little else, so there is
 * nothing for it to rank on. Leaving them out keeps crawlers on the pages that
 * can sell something.
 */
export async function sellableParts() {
  const { parts } = await loadCatalog();
  return parts.filter(hasPrice);
}

/** One file for the site's own pages, then one per block of parts. */
export async function sitemapFileCount(): Promise<number> {
  const parts = await sellableParts();
  return Math.ceil(parts.length / PARTS_PER_FILE) + 1;
}

export async function sitemapFileUrls(): Promise<string[]> {
  const count = await sitemapFileCount();
  return Array.from({ length: count }, (_, id) => `${site.url}/sitemap/${id}.xml`);
}

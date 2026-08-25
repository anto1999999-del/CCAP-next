import "server-only";
import { hasPrice } from "../parts/arrange";
import { loadCatalog } from "../parts/catalog";
import { isCanonicalListing } from "../parts/identity";
import { site } from "../site";

/**
 * How the sitemap is split, and where the pieces live.
 *
 * Shared by the sitemap itself, by robots.txt and by the index at
 * /sitemap_index.xml, because all three have to agree. Next serves a chunked
 * sitemap as /sitemap/0.xml, /sitemap/1.xml and so on and produces no index of
 * its own, so the index is a route handler and /sitemap.xml redirects to it.
 */

/** Well under Google's 50,000 URL limit, and small enough to fetch quickly. */
export const PARTS_PER_FILE = 10_000;

/**
 * Priced parts, one per listing.
 *
 * Two filters, for two reasons.
 *
 * An unpriced part's page says "contact for price" and little else, so there is
 * nothing for it to rank on. Leaving them out keeps crawlers on the pages that
 * can sell something.
 *
 * And where the yard holds several of the same part off several of the same
 * car, only the page the group elected is listed. A sitemap should contain
 * canonical URLs and nothing else: asking a crawler to fetch four addresses
 * that all declare a fifth as the real one wastes the crawl budget on pages
 * that were never going to be indexed.
 */
export async function sellableParts() {
  const { parts } = await loadCatalog();
  return parts.filter(
    (part) => hasPrice(part) && isCanonicalListing(part, parts),
  );
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

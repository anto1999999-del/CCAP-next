import type { MetadataRoute } from "next";
import { sitemapFileUrls } from "@/lib/seo/sitemap-files";
import { site } from "@/lib/site";

/**
 * What crawlers may look at.
 *
 * Carried from the live robots.txt. Everything blocked here is either one
 * person's own data (their cart, their orders) or a page that exists to be
 * signed into. None of it is useful in search results, and an indexed empty
 * cart tells a searcher the shop is empty.
 *
 * The catalogue and its parts are deliberately open: they are the reason the
 * site exists.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  return {
    rules: {
      userAgent: "*",
      disallow: [
        "/cart",
        "/place-order",
        "/order-success",
        "/my-account",
        "/orders",
        "/login",
        "/forgot-password",
        "/reset-password/",
        "/dashboard",
        "/manage-orders",
        "/manage-users",
        // The two content admin screens. Added when the CMS was built; a
        // missing line here is how an admin URL ends up in search results.
        "/manage-blog",
        "/manage-gallery",
        // Carried from the live robots.txt. The page no longer exists, and the
        // line stays because removing it invites a crawler to try the address.
        "/manage-slider-images",
        /*
          Next's page-data requests. A link that scrolls into view prefetches
          the page it points at as a `?_rsc=` request, and Googlebot follows
          them: on 5 Nov 2026 Search Console's crawl stats showed they were 26%
          of every request Google made to the site. They are not pages, are
          never indexed, and every one is a crawl not spent on a part. The real
          page is served as HTML at the same address without the parameter.
        */
        "/*_rsc=",
        /*
          The filtered catalogue. Every view is already noindex, and there is
          one for every make, model, year, part type and search, each with its
          own pagination. Google was fetching them deep into the pagination
          (make plus model plus page 40) instead of the parts themselves.
          Plain pagination, /products?page=N, stays open: it reaches every part
          in the catalogue, with no duplication. The filter order is fixed by
          `viewQuery` in the products page, so a filtered link always starts
          with one of these.
        */
        "/products?year=",
        "/products?make=",
        "/products?model=",
        "/products?part_type=",
        "/products?q=",
      ],
      allow: "/",
    },
    /*
      The index first, then every file by name.

      Next serves a chunked sitemap as /sitemap/0.xml and so on and builds no
      index of its own, and it will not let a route handler answer at
      /sitemap.xml either, so the index is at /sitemap_index.xml with a
      redirect pointing at it. Listing both the index and the files means a
      crawler that follows the index and a tool that only reads this file each
      get the whole thing.
    */
    sitemap: [`${site.url}/sitemap_index.xml`, ...(await sitemapFileUrls())],
  };
}

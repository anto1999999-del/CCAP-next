import type { MetadataRoute } from "next";
import { sitemapFileUrls } from "@/lib/seo/sitemap-files";

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
        "/manage-slider-images",
      ],
      allow: "/",
    },
    /*
      Every file by name. A chunked sitemap is served as /sitemap/0.xml and so
      on with no index at /sitemap.xml, so naming that address here would send
      every crawler to a 404.
    */
    sitemap: await sitemapFileUrls(),
  };
}

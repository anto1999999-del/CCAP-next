import { sitemapFileUrls } from "@/lib/seo/sitemap-files";

/**
 * The sitemap index.
 *
 * Next splits a large sitemap into /sitemap/0.xml, /sitemap/1.xml and so on,
 * and builds no index tying them together: /sitemap.xml returns a 404, and it
 * refuses to let a route handler serve that path because the metadata route
 * has claimed it. So the index lives here, and next.config redirects
 * /sitemap.xml to it.
 *
 * The address is the one Yoast uses, which is what the current blog serves and
 * what most tools try after /sitemap.xml.
 */
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const files = await sitemapFileUrls();

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...files.map((url) => `<sitemap><loc>${url}</loc></sitemap>`),
    "</sitemapindex>",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml",
      // An hour: the catalogue changes nightly, not by the minute.
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}

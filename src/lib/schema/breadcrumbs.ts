import { site } from "@/lib/site";

export type Crumb = {
  name: string;
  /** Site-relative path, e.g. "/about". */
  path: string;
};

/**
 * BreadcrumbList structured data.
 *
 * Renders no visible UI, this only tells search engines where a page sits in
 * the site, which is what produces the trail shown under a result instead of a
 * bare URL.
 */
export function breadcrumbSchema(crumbs: readonly Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: `${site.url}${crumb.path}`,
    })),
  };
}

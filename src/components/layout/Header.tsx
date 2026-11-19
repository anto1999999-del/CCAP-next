import { MAKE_PAGES } from "@/lib/content/make-pages";
import { PART_CATEGORIES } from "@/lib/content/part-categories";
import SiteHeader, { type PartsMenu } from "./header/SiteHeader";

/**
 * Site header.
 *
 * A server component that only gathers the links, so the menus can list every
 * part category and make without shipping those pages' copy to the browser:
 * `MAKE_PAGES` and `PART_CATEGORIES` carry several thousand words of page text
 * each, and the header needs a label and a path from them. Everything that
 * moves lives in `SiteHeader`.
 */
export default function Header() {
  const parts: PartsMenu = {
    categories: PART_CATEGORIES.map(({ slug, label }) => ({
      href: `/parts/${slug}`,
      label,
    })),
    makes: MAKE_PAGES.map(({ slug, label }) => ({
      href: `/wreckers/${slug}`,
      label,
    })),
  };

  return <SiteHeader parts={parts} />;
}

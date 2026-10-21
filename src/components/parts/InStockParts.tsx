import Link from "next/link";
import Container from "@/components/layout/Container";
import PartCard from "./PartCard";
import { partKey } from "@/lib/parts/identity";
import { getCatalogPage } from "@/lib/parts/repository";
import { EMPTY_FILTERS, type PartFilters } from "@/lib/parts/types";

/**
 * A grid of real parts on the make and category landing pages.
 *
 * These are the site's strongest indexable pages, and before this they linked
 * to no part at all. The catalogue's filtered and paged views are noindex, so
 * nearly every part page hung off the sitemap alone, and Search Console showed
 * over 13,000 of them as "discovered, currently not indexed": Google knew they
 * existed and saw no reason to crawl them. A plain link from a page Google
 * already crawls is the reason it needs.
 *
 * The parts come from the same ordered query as the catalogue's first page, so
 * priced parts lead and the grid matches what "view all" opens to.
 */
export default async function InStockParts({
  filters,
  heading,
  viewAllHref,
  viewAllLabel,
}: {
  filters: Partial<PartFilters>;
  heading: string;
  viewAllHref: string;
  viewAllLabel: string;
}) {
  const { page, available } = await getCatalogPage({
    filters: { ...EMPTY_FILTERS, ...filters },
  });

  // Nothing to show is better than an empty box with a heading over it.
  if (!available || page.parts.length === 0) return null;

  return (
    <section className="bg-admin pb-14 text-white md:pb-20">
      <Container>
        <h2 className="mb-8 text-center text-2xl font-extrabold tracking-tight md:text-3xl">
          {heading}
        </h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {page.parts.map((part) => (
            <PartCard key={partKey(part) ?? part.stockNo} part={part} />
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link
            href={viewAllHref}
            className="bg-brand hover:bg-brand-hover inline-flex items-center justify-center rounded-full px-6 py-3 text-xs font-bold tracking-[0.12em] text-white uppercase transition-colors"
          >
            {viewAllLabel}
          </Link>
        </div>
      </Container>
    </section>
  );
}

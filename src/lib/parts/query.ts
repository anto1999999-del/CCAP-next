import { arrangeParts } from "./arrange";
import { dedupeParts } from "./identity";
import { filterParts } from "./filter";
import { matchesQuery } from "./search";
import type { CatalogPart, PartFilters, PartsPage } from "./types";

/**
 * One page of the catalogue.
 *
 * Filter, then order, then cut the page. Doing it in that order is what makes
 * page one full: the old site asked the supplier for a page and filtered what
 * came back, so a page could arrive with three matches on it and the customer
 * had to guess whether page two held more.
 *
 * The catalogue is passed in rather than read here, so this stays a pure
 * function that can be reasoned about and checked on a fixed array.
 */

export const PARTS_PER_PAGE = 20;

/** The supplier's page size cap, kept so a hand-edited URL cannot ask for more. */
const MAX_PAGE_SIZE = 100;

/**
 * Every part that matches, in the order they should be shown.
 *
 * Separate from paging because it is the expensive half and the half that can
 * be reused: page 3 of a filtered catalogue is a slice of the same list as page
 * 2, so working it out again to show twenty rows is pure waste.
 */
export function orderedMatches({
  catalog,
  filters,
  query = "",
}: {
  catalog: readonly CatalogPart[];
  filters: PartFilters;
  query?: string;
}): CatalogPart[] {
  const matched = dedupeParts(
    filterParts(catalog, filters).filter((part) => matchesQuery(part, query)),
  );

  const narrowed = Boolean(filters.make || filters.model || query);
  return arrangeParts(matched, narrowed);
}

/** Cut one page out of an ordered result set. */
export function paginate(
  ordered: readonly CatalogPart[],
  page: number,
  pageSize = PARTS_PER_PAGE,
): PartsPage {
  const size = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.trunc(pageSize) || 1));
  const totalResults = ordered.length;
  const pageCount = Math.max(1, Math.ceil(totalResults / size));
  // A page number past the end shows the last page rather than nothing at all.
  const safePage = Math.min(Math.max(1, Math.trunc(page) || 1), pageCount);
  const start = (safePage - 1) * size;

  return {
    parts: ordered.slice(start, start + size),
    page: safePage,
    pageCount,
    totalResults,
  };
}

export function queryParts({
  catalog,
  filters,
  query = "",
  page = 1,
  pageSize = PARTS_PER_PAGE,
}: {
  catalog: readonly CatalogPart[];
  filters: PartFilters;
  query?: string;
  page?: number;
  pageSize?: number;
}): PartsPage {
  return paginate(orderedMatches({ catalog, filters, query }), page, pageSize);
}

/** Find one part by the identifiers in its URL. */
export function findPart(
  catalog: readonly CatalogPart[],
  urgId: string,
  invNumber: string,
): CatalogPart | null {
  return (
    catalog.find(
      (part) =>
        String(part.urgId) === String(urgId) &&
        String(part.invNumber) === String(invNumber),
    ) ?? null
  );
}

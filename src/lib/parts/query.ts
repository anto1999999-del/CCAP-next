import { arrangeParts } from "./arrange";
import { dedupeParts } from "./identity";
import { filterParts } from "./filter";
import {
  correctQuery,
  matchesQuery,
  rankByName,
  searchTerms,
} from "./search";
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
  // Ranked before arranging: priced parts still come first, and within them the
  // parts that are what was asked for come before parts that merely mention it.
  return arrangeParts(rankByName(matched, query), narrowed);
}

/** A narrower search that does find something, offered when a search finds nothing. */
export type SearchSuggestion = { query: string; count: number };

export type SearchOutcome = {
  /** Every matching part, in the order they should be shown. */
  ordered: CatalogPart[];
  /** Set when nothing matched as typed and a spelling correction did: the search that was run. */
  correctedQuery: string | null;
  /** Set only when nothing matched at all: the same search less one word. */
  suggestions: SearchSuggestion[];
};

const MAX_SUGGESTIONS = 3;

/**
 * A search as the parts page runs it.
 *
 * A search that finds something is left exactly as it was: the spelling
 * correction and the suggestions only run when the words as typed found
 * nothing, so they can never change a result that was already right. When
 * they do run, the page says so ("Showing results for ...").
 *
 * The suggestions answer the dead end. "hilux gearbox" finds nothing because
 * there is no HiLux gearbox in stock, and the page used to stop there; now it
 * offers the HiLux parts and the gearboxes that are in stock instead.
 */
export function searchCatalog({
  catalog,
  filters,
  query = "",
}: {
  catalog: readonly CatalogPart[];
  filters: PartFilters;
  query?: string;
}): SearchOutcome {
  const ordered = orderedMatches({ catalog, filters, query });
  if (ordered.length > 0 || !query.trim()) {
    return { ordered, correctedQuery: null, suggestions: [] };
  }

  const corrected = correctQuery(catalog, query);
  if (corrected) {
    const found = orderedMatches({ catalog, filters, query: corrected });
    if (found.length > 0) {
      return { ordered: found, correctedQuery: corrected, suggestions: [] };
    }
  }

  const terms = searchTerms(corrected ?? query);
  if (terms.length < 2 || terms.length > 5) {
    return { ordered, correctedQuery: null, suggestions: [] };
  }

  /*
    The search less one word, and each word on its own. A short bare number is
    left out of any suggestion: "200" from "landcruiser 200 alternator" only
    means something next to the model it belongs to.
  */
  const candidates = [
    ...terms.map((_, dropped) => terms.filter((_, at) => at !== dropped)),
    // One word alone only when it can stand alone: "box" from "gear box" cannot.
    ...(terms.length > 2
      ? terms.filter((term) => term.length >= 4).map((term) => [term])
      : []),
  ]
    .filter((words) => !words.some((word) => /^\d{1,3}$/.test(word)))
    .map((words) => words.join(" "));

  const suggestions = [...new Set(candidates)]
    .map((shorter) => ({
      query: shorter,
      count: orderedMatches({ catalog, filters, query: shorter }).length,
    }))
    .filter((suggestion) => suggestion.count > 0)
    // Closest to what was typed first: more words kept, then more parts.
    .sort(
      (a, b) =>
        searchTerms(b.query).length - searchTerms(a.query).length ||
        b.count - a.count,
    )
    .slice(0, MAX_SUGGESTIONS);

  return { ordered, correctedQuery: null, suggestions };
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

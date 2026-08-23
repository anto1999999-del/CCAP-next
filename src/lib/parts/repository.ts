import "server-only";
import { loadCatalog } from "./catalog";
import { deriveFilterOptions } from "./filter";
import { orderedMatches, paginate } from "./query";
import type {
  CatalogPart,
  FilterOptions,
  PartFilters,
  PartsPage,
} from "./types";

/**
 * What the pages ask for, with the repeated work remembered.
 *
 * Filtering 32,698 parts, working out which years and makes exist among them,
 * and spreading them across vehicles costs about 100ms. That is fine once, and
 * wasteful on every request for a page that has not changed since the last
 * sync: the answer to "page 3 of Toyota parts" is the same for everybody until
 * the catalogue is next synced.
 *
 * So results are cached against the catalogue itself. When a sync replaces it,
 * the array identity changes and everything cached from it is dropped. There is
 * no expiry to tune and nothing to invalidate by hand, because the only thing
 * that can make a cached answer wrong is a new catalogue.
 *
 * The caches hold references to parts, not copies, so a full result set is an
 * array of pointers rather than another catalogue.
 */

/** Enough for the filters people actually use, small enough to stay bounded. */
const MAX_CACHED_RESULTS = 32;
const MAX_CACHED_OPTIONS = 64;

let cachedFor: readonly CatalogPart[] | null = null;
const orderedResults = new Map<string, CatalogPart[]>();
const filterOptions = new Map<string, FilterOptions>();

function resetIfCatalogChanged(parts: readonly CatalogPart[]): void {
  if (cachedFor === parts) return;
  cachedFor = parts;
  orderedResults.clear();
  filterOptions.clear();
}

/** Oldest entry out first: Map iterates in insertion order. */
function remember<T>(cache: Map<string, T>, key: string, value: T, cap: number) {
  if (cache.size >= cap) cache.delete(cache.keys().next().value!);
  cache.set(key, value);
  return value;
}

function cacheKey(filters: PartFilters, query: string): string {
  return [filters.year, filters.make, filters.model, filters.partType, query]
    .map((part) => part.toLowerCase())
    .join("|");
}

export type CatalogView = {
  page: PartsPage;
  options: FilterOptions;
  /** False when no sync has run, so the page can say so rather than show nothing. */
  available: boolean;
  syncedAt: string | null;
};

export async function getCatalogPage({
  filters,
  query = "",
  page = 1,
}: {
  filters: PartFilters;
  query?: string;
  page?: number;
}): Promise<CatalogView> {
  const { parts, available, syncedAt } = await loadCatalog();
  resetIfCatalogChanged(parts);

  const key = cacheKey(filters, query);

  /*
    The whole matching set is ordered once and kept, so paging through it costs
    a slice. Page 47 of a filtered catalogue would otherwise repeat the filter,
    the dedupe and the spread to show twenty rows.
  */
  const ordered =
    orderedResults.get(key) ??
    remember(
      orderedResults,
      key,
      orderedMatches({ catalog: parts, filters, query }),
      MAX_CACHED_RESULTS,
    );

  const optionsKey = cacheKey({ ...filters, partType: "" }, "");
  const options =
    filterOptions.get(optionsKey) ??
    remember(
      filterOptions,
      optionsKey,
      deriveFilterOptions(parts, filters),
      MAX_CACHED_OPTIONS,
    );

  return {
    page: paginate(ordered, page),
    options,
    available,
    syncedAt,
  };
}

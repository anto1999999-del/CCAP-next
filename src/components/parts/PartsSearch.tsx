import Link from "next/link";
import type { PartFilters } from "@/lib/parts/types";

/**
 * Search the catalogue.
 *
 * There has never been a working one. The old codebase carries a SearchBar
 * component that only renders when the path contains "collection", and no such
 * path exists on this site, so 32,698 parts have only ever been reachable by
 * paging through them or narrowing the four dropdowns.
 *
 * A plain GET form, like the filters, so it works without JavaScript and every
 * search has a URL that can be shared. The filters travel with it as hidden
 * fields: searching inside a chosen make should narrow that make, not throw the
 * choice away.
 */
export default function PartsSearch({
  query,
  filters,
  resultCount,
}: {
  query: string;
  filters: PartFilters;
  /** Shown once a search has been made, so an empty result reads as an answer. */
  resultCount: number | null;
}) {
  const hidden: [string, string][] = [
    ["year", filters.year],
    ["make", filters.make],
    ["model", filters.model],
    ["part_type", filters.partType],
  ];

  return (
    <div className="w-full sm:max-w-md">
      <form action="/products" method="GET" role="search" className="flex gap-2">
        {hidden.map(([name, value]) =>
          value ? (
            <input key={name} type="hidden" name={name} value={value} />
          ) : null,
        )}

        <label htmlFor="parts-search" className="sr-only">
          Search parts by name, make or model
        </label>
        <input
          id="parts-search"
          name="q"
          type="search"
          defaultValue={query}
          placeholder="Search parts, e.g. hilux alternator"
          className="focus:border-brand min-w-0 flex-1 rounded-xl border border-gray-700 bg-[#1a1a1a] px-4 py-2.5 text-sm text-white placeholder-gray-500 transition-colors focus:outline-none"
        />
        <button
          type="submit"
          className="bg-brand hover:bg-brand-hover rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-colors"
        >
          Search
        </button>
      </form>

      {query && (
        <p className="mt-2 text-xs text-gray-400">
          {resultCount === 0
            ? `Nothing matches "${query}".`
            : `${resultCount?.toLocaleString()} ${resultCount === 1 ? "part" : "parts"} matching "${query}".`}{" "}
          <Link href="/products" className="text-brand-text hover:underline">
            Clear
          </Link>
        </p>
      )}
    </div>
  );
}

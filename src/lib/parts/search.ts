import { matchesPartType, searchTermMeansPartType } from "./part-type";
import type { CatalogPart } from "./types";

/**
 * Free-text search over the catalogue.
 *
 * Every word typed has to match something about the part, so "2015 hilux
 * bumper" narrows rather than widens. Words that name a whole assembly are
 * matched as part types instead of as text, so "engine" returns engines and not
 * engine covers.
 */

function haystack(part: CatalogPart): string {
  return [
    part.itemName,
    part.manufacturer,
    part.model,
    part.year,
    (part.longIcYear ?? []).join(" "),
    part.itemTypeCode,
    part.stockNo,
    part.icDesc,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function matchesQuery(part: CatalogPart, query: string): boolean {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;

  const text = haystack(part);

  return terms.every((term) =>
    searchTermMeansPartType(term)
      ? matchesPartType(part, term)
      : text.includes(term),
  );
}

/**
 * Read a year, make and model out of a typed query.
 *
 * Used to turn a search box entry such as "2022 lexus es" into the same filter
 * state the sidebar would produce, so a search and a filtered browse land on
 * the same results.
 */
export function parseSearchQuery(query: string): {
  year: string;
  make: string;
  model: string;
} {
  const text = query.trim();
  if (!text) return { year: "", make: "", model: "" };

  const year = text.match(/\b(?:19|20)\d{2}\b/)?.[0] ?? "";
  const words = text
    .replace(/\b(?:19|20)\d{2}\b/, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return {
    year,
    make: words[0]?.toUpperCase() ?? "",
    model: words.slice(1).join(" "),
  };
}

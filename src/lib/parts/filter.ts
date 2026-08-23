/**
 * Filtering the catalogue by year, make, model and part type.
 *
 * Pure functions over an array, deliberately. The supplier's API accepts these
 * as query parameters but does not honour them: asking it for a year returns a
 * handful of rows rather than the matches. Every filter the site offers is
 * therefore applied against the synced catalogue, which is also what makes the
 * counts and the cascading options truthful.
 */

import { matchesPartType } from "./part-type";
import type { CatalogPart, FilterOptions, PartFilters } from "./types";

/**
 * A part matches a year if it was fitted that year or interchanges into it.
 *
 * Ignoring longIcYear would hide most of the catalogue from a year search: a
 * part off a 2015 car that fits 2013 through 2018 is a valid answer for all six
 * of those years, and the supplier records that in longIcYear alone.
 */
function matchesYear(part: CatalogPart, year: string): boolean {
  if (!year) return true;
  const wanted = year.trim();
  if (part.year != null && String(part.year) === wanted) return true;
  return (part.longIcYear ?? []).some((entry) => String(entry) === wanted);
}

/**
 * Make and model are compared loosely, in both directions.
 *
 * The catalogue and the filter list do not always agree on how much of a name
 * to include ("LANDCRUISER PRADO" against "PRADO"), so a match either way
 * counts. This is what the current site does; tightening it would drop parts
 * the yard genuinely holds.
 */
function looselyMatches(value: string | null, wanted: string): boolean {
  if (!wanted) return true;
  const needle = wanted.trim().toLowerCase();
  const found = (value ?? "").trim().toLowerCase();
  if (!found) return false;
  return found.includes(needle) || needle.includes(found);
}

export function matchesFilters(
  part: CatalogPart,
  filters: PartFilters,
): boolean {
  return (
    matchesYear(part, filters.year) &&
    looselyMatches(part.manufacturer, filters.make) &&
    looselyMatches(part.model, filters.model) &&
    matchesPartType(part, filters.partType)
  );
}

export function anyFilterActive(filters: PartFilters): boolean {
  return Boolean(
    filters.year || filters.make || filters.model || filters.partType,
  );
}

export function filterParts(
  parts: readonly CatalogPart[],
  filters: PartFilters,
): CatalogPart[] {
  if (!anyFilterActive(filters)) return [...parts];
  return parts.filter((part) => matchesFilters(part, filters));
}

function sortedUnique(values: (string | null)[]): string[] {
  return [
    ...new Set(
      values
        .filter((value): value is string => Boolean(value))
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b));
}

/**
 * The choices to offer, narrowed by what has already been chosen.
 *
 * The controls cascade: makes are those with parts in the chosen year, models
 * those within the chosen make, part types what those models actually have.
 * Offering every value at every step lets a customer build a combination the
 * yard has nothing for, which is how the old site produced empty pages.
 */
export function deriveFilterOptions(
  parts: readonly CatalogPart[],
  filters: PartFilters,
): FilterOptions {
  const years = [
    ...new Set(
      parts.flatMap((part) => [
        part.year == null ? null : String(part.year),
        ...(part.longIcYear ?? []).map(String),
      ]),
    ),
  ]
    .filter((year): year is string => Boolean(year))
    .sort((a, b) => Number(b) - Number(a));

  const { year, make, model } = filters;

  const forMakes = year
    ? filterParts(parts, { year, make: "", model: "", partType: "" })
    : parts;
  const makes = sortedUnique(forMakes.map((part) => part.manufacturer));

  // Until a make is chosen there is no useful model list: every model in the
  // catalogue is thousands of entries and none of them narrow anything.
  const forModels = make
    ? filterParts(parts, { year, make, model: "", partType: "" })
    : [];
  const models = sortedUnique(forModels.map((part) => part.model));

  const forTypes = model
    ? filterParts(parts, { year, make, model, partType: "" })
    : year || make
      ? []
      : parts;
  const partTypes = sortedUnique(forTypes.map((part) => part.itemTypeCode));

  return { years, makes, models, partTypes };
}

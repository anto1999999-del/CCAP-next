import { hasPrice } from "./arrange";
import { isCanonicalListing, partKey } from "./identity";
import type { CatalogPart } from "./types";

/**
 * The "more parts for this vehicle" row on a part page.
 *
 * This row is most of the internal linking the catalogue has. Category and make
 * pages show a handful of parts each, and the paginated catalogue is noindex,
 * so for most parts the only links pointing at them are from other parts.
 *
 * It used to show the first four parts of the same make and model, in
 * catalogue order. Every part of a 2014 IX35 linked to the same four pages,
 * and the other hundred got no links at all. Search Console showed the result
 * on 5 Nov 2026: 12,347 part pages Google knew from the sitemap but had not
 * fetched, because nothing on the site suggested they mattered.
 *
 * Now each part shows the parts that follow it in its vehicle's list, wrapping
 * round at the end. Every part in a group is linked from the ones before it,
 * so the links are spread across the whole group and nothing is left out.
 *
 * Priced, canonical listings come first because those are the pages that can
 * be indexed. A link to a twin is a crawl spent on a page whose canonical
 * points somewhere else. Other parts of the vehicle only fill the row when a
 * group is too small to fill it on its own, which is what the row did before.
 */

function vehicleKey(part: CatalogPart): string {
  return `${(part.manufacturer ?? "").trim().toUpperCase()}|${(part.model ?? "").trim().toUpperCase()}`;
}

function sortKey(part: CatalogPart): string {
  return partKey(part) ?? "";
}

type Groups = Map<string, { indexable: CatalogPart[]; rest: CatalogPart[] }>;

let groupedFor: readonly CatalogPart[] | null = null;
let grouped: Groups | null = null;

/**
 * Cached against the catalogue array, like the canonical election. Grouping
 * 38,000 parts on every page render would cost more than rendering the page.
 */
function groupsFor(catalogue: readonly CatalogPart[]): Groups {
  if (groupedFor !== catalogue || !grouped) {
    const groups: Groups = new Map();

    for (const part of catalogue) {
      if (!part.manufacturer || !part.model) continue;
      const key = vehicleKey(part);
      let group = groups.get(key);
      if (!group) {
        group = { indexable: [], rest: [] };
        groups.set(key, group);
      }
      const indexable = hasPrice(part) && isCanonicalListing(part, catalogue);
      (indexable ? group.indexable : group.rest).push(part);
    }

    // A fixed order, so a part shows the same neighbours on every render and
    // every night's sync, rather than whatever order the feed arrived in.
    for (const group of groups.values()) {
      group.indexable.sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
      group.rest.sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
    }

    grouped = groups;
    groupedFor = catalogue;
  }

  return grouped;
}

/**
 * The `count` parts after `key` in a sorted list, wrapping round, never
 * including `key` itself. A part not in the list starts where it would sort.
 */
function following(
  list: readonly CatalogPart[],
  key: string,
  count: number,
): CatalogPart[] {
  if (list.length === 0) return [];

  let start = list.findIndex((part) => sortKey(part).localeCompare(key) > 0);
  if (start === -1) start = 0;

  const picked: CatalogPart[] = [];
  for (let step = 0; step < list.length && picked.length < count; step += 1) {
    const part = list[(start + step) % list.length];
    if (sortKey(part) !== key) picked.push(part);
  }
  return picked;
}

export function relatedParts(
  part: CatalogPart,
  catalogue: readonly CatalogPart[],
  count = 4,
): CatalogPart[] {
  if (!part.manufacturer || !part.model) return [];

  const group = groupsFor(catalogue).get(vehicleKey(part));
  if (!group) return [];

  const key = sortKey(part);
  const picked = following(group.indexable, key, count);
  if (picked.length < count) {
    picked.push(...following(group.rest, key, count - picked.length));
  }
  return picked;
}

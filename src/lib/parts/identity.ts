import type { CatalogPart } from "./types";

/**
 * What makes a part one part.
 *
 * The supplier's paginated feed returns the same row on more than one page, so
 * concatenating pages produces duplicates. urgId with invNumber is the
 * supplier's own key; stockNo is the fallback for rows missing it.
 */
export function partKey(part: CatalogPart): string | null {
  const urgId = String(part.urgId ?? "")
    .trim()
    .toLowerCase();
  const invNumber = String(part.invNumber ?? "").trim();
  if (urgId && invNumber) return `${urgId}|${invNumber}`;

  const stockNo = String(part.stockNo ?? "").trim();
  return stockNo ? `stock|${stockNo.toLowerCase()}` : null;
}

/** First occurrence wins, so order is preserved and pagination stays stable. */
export function dedupeParts(parts: readonly CatalogPart[]): CatalogPart[] {
  const seen = new Set<string>();
  const unique: CatalogPart[] = [];

  for (const part of parts) {
    const key = partKey(part);
    // A row with no identifiers cannot be compared, so it is kept as it is.
    if (!key) {
      unique.push(part);
      continue;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(part);
  }

  return unique;
}

/** The page a part lives at. The path shape is carried over from the old site. */
export function partPath(part: CatalogPart): string {
  return `/product/${part.urgId}/${part.invNumber}`;
}

/**
 * One page per part, where the catalogue holds several of the same thing.
 *
 * A wrecker's feed lists an item per physical part, so a Wiper Motor off a 2014
 * Hyundai IX35 appears once for every one of those cars in the yard. Measured
 * across the catalogue: 20,427 of 32,698 parts share their name, make, model
 * and year with at least one other part, in 6,459 groups.
 *
 * Every one of those produces a page with the same title, the same description
 * and near-identical body text. Search engines treat that as duplicate content
 * and pick one arbitrarily, so four weak pages compete instead of one strong
 * one, and which of them is findable is not something anybody chose.
 *
 * `stockNo` cannot separate them: it is the donor vehicle, not the part. Stock
 * CC0342 is one 2014 IX35 and 147 rows carry it.
 *
 * So the group elects one page to be the real address, the rest point their
 * canonical at it, and only the elected one goes in the sitemap. All of them
 * keep working, keep their photographs and can still be bought, because a
 * customer following an old link should never meet a 404. They simply stop
 * competing with each other in search results.
 */

/** What makes two parts the same listing: what it is, and what it came off. */
function listingIdentity(part: CatalogPart): string {
  return [part.itemName, part.manufacturer, part.model, part.year]
    .map((value) => String(value ?? "").trim().toUpperCase())
    .join("|");
}

/**
 * The better page of two identical listings.
 *
 * More photographs first, because that is the page worth showing. The
 * inventory number breaks the tie, so the choice is the same on every render
 * and every night's sync rather than depending on array order.
 */
function preferred(a: CatalogPart, b: CatalogPart): CatalogPart {
  const byImages = (b.images?.length ?? 0) - (a.images?.length ?? 0);
  if (byImages !== 0) return byImages < 0 ? a : b;

  return String(a.invNumber) <= String(b.invNumber) ? a : b;
}

let electedFor: readonly CatalogPart[] | null = null;
let elected: Map<string, CatalogPart> | null = null;

function electionFor(catalogue: readonly CatalogPart[]): Map<string, CatalogPart> {
  // Cached against the catalogue array itself, like the filters and the
  // ordering: scanning 32,000 rows to render one page would be absurd.
  if (electedFor !== catalogue || !elected) {
    const winners = new Map<string, CatalogPart>();

    for (const part of catalogue) {
      const identity = listingIdentity(part);
      const standing = winners.get(identity);
      winners.set(identity, standing ? preferred(standing, part) : part);
    }

    elected = winners;
    electedFor = catalogue;
  }

  return elected;
}

/** The address this part's listing should be indexed under. */
export function canonicalPathFor(
  part: CatalogPart,
  catalogue: readonly CatalogPart[],
): string {
  const winner = electionFor(catalogue).get(listingIdentity(part));
  return partPath(winner ?? part);
}

/** True when this part is the one its group elected. Used by the sitemap. */
export function isCanonicalListing(
  part: CatalogPart,
  catalogue: readonly CatalogPart[],
): boolean {
  const winner = electionFor(catalogue).get(listingIdentity(part));
  return !winner || partPath(winner) === partPath(part);
}

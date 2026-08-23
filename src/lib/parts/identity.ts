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

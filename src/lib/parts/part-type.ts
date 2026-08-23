/**
 * Matching a part against a part-type filter.
 *
 * Comparison is on the whole code, never a substring: filtering for "engine"
 * must not also return ENGINE_COVER, ENGINE_MOUNT and ENGINE_LOOM, which is
 * what a substring test does.
 */

import type { CatalogPart } from "./types";

/**
 * Words customers type, mapped to the code the supplier uses. Kept small on
 * purpose: each alias here is one that a real search needed.
 */
const ALIASES: Record<string, string> = {
  engine: "ENGINE",
  engines: "ENGINE",
  motor: "ENGINE",
  motors: "ENGINE",
  gearbox: "GEARBOX",
  gearboxes: "GEARBOX",
  transmission: "GEARBOX",
  transmissions: "GEARBOX",
};

/** "engine cover", "Engine Cover" and "ENGINE_COVER" are one code. */
export function normalisePartTypeCode(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
}

/** Turn whatever the customer typed into a code from the catalogue. */
export function resolvePartTypeFilter(filter: string): string {
  const raw = filter.trim();
  if (!raw) return "";

  const alias = ALIASES[raw.toLowerCase().replace(/\s+/g, "_")];
  return alias ?? normalisePartTypeCode(raw);
}

export function matchesPartType(part: CatalogPart, filter: string): boolean {
  const wanted = resolvePartTypeFilter(filter);
  if (!wanted) return true;
  return normalisePartTypeCode(part.itemTypeCode) === wanted;
}

/**
 * Whether a free-text search word names a whole assembly.
 *
 * Someone searching "engine" wants engines, so the word is treated as a part
 * type rather than as text to look for in the description, where it would also
 * match every engine cover and engine mount.
 */
export function searchTermMeansPartType(term: string): string | null {
  return ALIASES[term.trim().toLowerCase().replace(/\s+/g, "_")] ?? null;
}

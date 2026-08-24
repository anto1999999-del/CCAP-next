/**
 * Matching a part against a part-type filter.
 *
 * Comparison is on the whole code, never a substring: filtering for "engine"
 * must not also return ENGINE_COVER, ENGINE_MOUNT and ENGINE_LOOM, which is
 * what a substring test does.
 */

import type { CatalogPart } from "./types";

/**
 * Words customers type, mapped to the codes the supplier uses.
 *
 * A word can mean more than one code, and gearboxes are why. The current site
 * maps "gearbox" to GEARBOX, and the catalogue has no such code: it files all
 * 234 of them under TRANS_GEARBOX. So searching the live site for a gearbox
 * finds nothing at all, and has done for as long as the alias table has existed.
 * Both codes are listed here so that stays fixed if the supplier ever changes
 * its mind.
 */
const ALIASES: Record<string, string[]> = {
  engine: ["ENGINE"],
  engines: ["ENGINE"],
  motor: ["ENGINE"],
  motors: ["ENGINE"],
  gearbox: ["GEARBOX", "TRANS_GEARBOX"],
  gearboxes: ["GEARBOX", "TRANS_GEARBOX"],
  transmission: ["GEARBOX", "TRANS_GEARBOX"],
  transmissions: ["GEARBOX", "TRANS_GEARBOX"],
};

/** "engine cover", "Engine Cover" and "ENGINE_COVER" are one code. */
export function normalisePartTypeCode(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
}

/**
 * The codes a filter means.
 *
 * An empty list means "no filter". Anything that is not a known word is taken
 * as a code in its own right, which is what the dropdown sends.
 */
export function resolvePartTypeFilter(filter: string): string[] {
  const raw = filter.trim();
  if (!raw) return [];

  const alias = ALIASES[raw.toLowerCase().replace(/\s+/g, "_")];
  return alias ?? [normalisePartTypeCode(raw)];
}

export function matchesPartType(part: CatalogPart, filter: string): boolean {
  const wanted = resolvePartTypeFilter(filter);
  if (wanted.length === 0) return true;
  return wanted.includes(normalisePartTypeCode(part.itemTypeCode));
}

/**
 * Whether a free-text search word names a whole assembly.
 *
 * Someone searching "engine" wants engines, so the word is matched as a part
 * type rather than as text, where it would also hit every engine cover and
 * engine mount.
 */
export function searchTermMeansPartType(term: string): boolean {
  return Boolean(ALIASES[term.trim().toLowerCase().replace(/\s+/g, "_")]);
}

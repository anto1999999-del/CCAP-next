import "server-only";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { dedupeParts } from "./identity";
import type { CatalogPart, PartImage } from "./types";

/**
 * Where the catalogue is read from.
 *
 * The supplier's API cannot serve the site directly: it does not honour filter
 * parameters, it is regularly slow, and asking it for 32,000 parts to answer
 * one page view would be absurd. So the whole catalogue is synced to a file
 * (scripts/sync-parts-catalog.mjs) and every page reads it from there.
 *
 * The file is parsed once and held in memory, and re-read only when it changes
 * on disk, so a sync is picked up without a restart while a page render never
 * pays for parsing 32,000 rows.
 *
 * Everything above this layer takes a plain array, so when the catalogue moves
 * into the database this file is the only one that changes.
 */

export type CatalogSnapshot = {
  parts: CatalogPart[];
  syncedAt: string | null;
  /** False when no sync has run yet, so pages can say so instead of showing nothing. */
  available: boolean;
};

const EMPTY: CatalogSnapshot = { parts: [], syncedAt: null, available: false };

function catalogPath(): string {
  const configured = process.env.PARTS_CATALOG_PATH?.trim();
  return configured
    ? path.resolve(configured)
    : path.join(process.cwd(), "content", "parts", "catalog.json");
}

function galleriesPath(): string {
  return path.join(path.dirname(catalogPath()), "galleries.json");
}

let snapshot: CatalogSnapshot = EMPTY;
let loadedFrom: { path: string; mtimeMs: number } | null = null;
/** Concurrent renders share one read rather than each parsing the file. */
let inFlight: Promise<CatalogSnapshot> | null = null;

async function read(): Promise<CatalogSnapshot> {
  const file = catalogPath();

  let mtimeMs: number;
  try {
    ({ mtimeMs } = await stat(file));
  } catch {
    // No sync has run. Pages handle this rather than crashing.
    snapshot = EMPTY;
    loadedFrom = null;
    return snapshot;
  }

  if (loadedFrom && loadedFrom.path === file && loadedFrom.mtimeMs === mtimeMs) {
    return snapshot;
  }

  const parsed = JSON.parse(await readFile(file, "utf8")) as {
    syncedAt?: string;
    results?: CatalogPart[];
  };

  snapshot = {
    parts: dedupeParts(parsed.results ?? []),
    syncedAt: parsed.syncedAt ?? null,
    available: true,
  };
  loadedFrom = { path: file, mtimeMs };

  return snapshot;
}

/**
 * Every photograph of every part, keyed the way `partKey` keys them.
 *
 * Held apart from the catalogue because the grid needs one thumbnail per part
 * and the detail page needs all six: carrying every image in the catalogue took
 * the old backend from about 150MB resident to 1.2GB, on a 2GB droplet. Loaded
 * on first use, so a visitor who never opens a part never pays for it.
 */
let galleries: Record<string, PartImage[]> | null = null;

export async function loadGallery(key: string): Promise<PartImage[]> {
  galleries ??= await readFile(galleriesPath(), "utf8")
    .then((raw) => (JSON.parse(raw) as { galleries: Record<string, PartImage[]> }).galleries)
    // No sync yet, or no galleries file: the catalogue's own image still shows.
    .catch(() => ({}));

  return galleries[key] ?? [];
}

export async function loadCatalog(): Promise<CatalogSnapshot> {
  inFlight ??= read().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

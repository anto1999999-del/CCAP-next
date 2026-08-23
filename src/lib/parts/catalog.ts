import "server-only";
import { createHash } from "node:crypto";
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

function galleryShardPath(key: string): string {
  const shard = createHash("sha1").update(key).digest("hex").slice(0, 2);
  return path.join(path.dirname(catalogPath()), "galleries", `${shard}.ndjson`);
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
 * These are held apart from the catalogue, and split across 256 files, because
 * together they are 290MB. The grid needs one thumbnail per part; only a part
 * page needs the rest. Loading them all would put the site back where the old
 * backend was, at 1.2GB resident on a 2GB droplet.
 *
 * A part page therefore reads the one file its part is in, about a megabyte.
 * The few most recently read stay parsed, which covers the common case of
 * someone looking through several parts, and the cache is capped so a crawler
 * working through the catalogue cannot walk it up to 290MB.
 */
type Shard = Map<string, PartImage[]>;

const shards = new Map<string, Shard>();
const MAX_CACHED_SHARDS = 8;

function parseShard(contents: string): Shard {
  const shard: Shard = new Map();
  for (const line of contents.split("\n")) {
    if (!line) continue;
    const { k, i } = JSON.parse(line) as { k: string; i: PartImage[] };
    shard.set(k, i);
  }
  return shard;
}

export async function loadGallery(key: string): Promise<PartImage[]> {
  const file = galleryShardPath(key);

  let shard = shards.get(file);
  if (!shard) {
    shard = await readFile(file, "utf8")
      .then(parseShard)
      // No sync yet, or nothing in this shard: the catalogue's own image shows.
      .catch(() => new Map<string, PartImage[]>());

    // Oldest out first: Map preserves insertion order, so this is the least
    // recently loaded shard.
    if (shards.size >= MAX_CACHED_SHARDS) {
      shards.delete(shards.keys().next().value!);
    }
    shards.set(file, shard);
  }

  return shard.get(key) ?? [];
}

export async function loadCatalog(): Promise<CatalogSnapshot> {
  inFlight ??= read().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

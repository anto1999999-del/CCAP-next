import "server-only";
import type { Metadata } from "next";
import type { Collection } from "mongodb";
import { db, isConfigured } from "../db/mongo";
import {
  PART_TEMPLATE_PATH,
  applyOverride,
  type OverrideInput,
  type PageOverride,
  type PartTemplate,
} from "./overrides";

/**
 * The `seo_overrides` collection: one document per page, plus one for the
 * part-page template.
 *
 * Reads never throw. A page asks here before it builds its metadata, and a
 * database that is slow or down must leave the page with the title it has
 * always had rather than an error.
 */

type OverrideFields = {
  metaTitle?: string;
  metaDescription?: string;
  titlePattern?: string;
  descriptionPattern?: string;
};

export type OverrideDocument = OverrideFields & {
  path: string;
  /** The row in the sheet's CHANGES tab this came from. */
  changeId: string;
  updatedAt: Date;
  /** What this replaced, so one step back is always possible. */
  previous: OverrideFields | null;
};

declare global {
  var __ccapSeoIndex: Promise<unknown> | undefined;
  var __ccapPartTemplate:
    | { value: PartTemplate | null; readAt: number }
    | undefined;
}

async function collection(): Promise<Collection<OverrideDocument>> {
  return (await db()).collection<OverrideDocument>("seo_overrides");
}

/** Made on the first write rather than at start-up, which has no hook. */
async function ensureIndex(): Promise<void> {
  globalThis.__ccapSeoIndex ??= collection().then((overrides) =>
    overrides.createIndex({ path: 1 }, { unique: true }),
  );
  await globalThis.__ccapSeoIndex;
}

function fieldsOf(document: OverrideFields): OverrideFields {
  const fields: OverrideFields = {};
  if (document.metaTitle) fields.metaTitle = document.metaTitle;
  if (document.metaDescription) fields.metaDescription = document.metaDescription;
  if (document.titlePattern) fields.titlePattern = document.titlePattern;
  if (document.descriptionPattern) {
    fields.descriptionPattern = document.descriptionPattern;
  }
  return fields;
}

/* ------------------------------------------------------------------ reads */

export async function findOverride(
  path: string,
): Promise<OverrideDocument | null> {
  return (await collection()).findOne({ path }, { projection: { _id: 0 } });
}

/**
 * The override for one page, or null.
 *
 * Asked for directly each time rather than held in memory. The pages that use
 * it are prerendered: they call this at build time and again only when they
 * are revalidated, which is exactly when the stored value has just changed and
 * a remembered copy would be the wrong one.
 */
async function pageOverride(path: string): Promise<PageOverride | null> {
  if (!isConfigured()) return null;
  try {
    return await findOverride(path);
  } catch {
    return null;
  }
}

/** A page's metadata with its override, if it has one, laid over it. */
export async function withSeoOverride(
  path: string,
  base: Metadata,
): Promise<Metadata> {
  return applyOverride(path, base, await pageOverride(path));
}

/** How long the part template is trusted before it is read again. */
const TEMPLATE_TTL_MS = 60_000;

/**
 * The part-page template, or null.
 *
 * Part pages are rendered per request and there are about 15,000 of them, so
 * this one is remembered: one read a minute for the whole catalogue, whatever
 * the traffic. A change through the API forgets the copy at once; the minute
 * only matters if a second server process is ever run.
 */
export async function partTemplate(): Promise<PartTemplate | null> {
  if (!isConfigured()) return null;

  const held = globalThis.__ccapPartTemplate;
  if (held && Date.now() - held.readAt < TEMPLATE_TTL_MS) return held.value;

  let value: PartTemplate | null = null;
  try {
    value = await findOverride(PART_TEMPLATE_PATH);
  } catch {
    // Remembered as "none" for the minute too, so a database that is down is
    // not asked again by every part page.
  }

  globalThis.__ccapPartTemplate = { value, readAt: Date.now() };
  return value;
}

function forgetPartTemplate(path: string) {
  if (path === PART_TEMPLATE_PATH) globalThis.__ccapPartTemplate = undefined;
}

/* ----------------------------------------------------------------- writes */

export async function saveOverride(input: OverrideInput): Promise<void> {
  await ensureIndex();
  const overrides = await collection();
  const existing = await overrides.findOne({ path: input.path });

  const fields: OverrideFields =
    input.kind === "template"
      ? fieldsOf({
          titlePattern: input.titlePattern,
          descriptionPattern: input.descriptionPattern,
        })
      : fieldsOf({
          metaTitle: input.metaTitle,
          metaDescription: input.metaDescription,
        });

  await overrides.replaceOne(
    { path: input.path },
    {
      path: input.path,
      ...fields,
      changeId: input.changeId,
      updatedAt: new Date(),
      previous: existing ? fieldsOf(existing) : null,
    },
    { upsert: true },
  );

  forgetPartTemplate(input.path);
}

export async function deleteOverride(path: string): Promise<void> {
  await (await collection()).deleteOne({ path });
  forgetPartTemplate(path);
}

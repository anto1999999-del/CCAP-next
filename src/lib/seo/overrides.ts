import type { Metadata } from "next";
import { z } from "zod";
import { site } from "../site";

/**
 * Titles and descriptions that can be changed without a deploy.
 *
 * The title agent tests a new title against search data and has to be able to
 * put the old one back by itself when the new one does worse. A title written
 * in a page file needs a build and a restart to change, which takes the site
 * down for a minute each time, so the agent writes to a collection instead
 * and every public page looks there first.
 *
 * Everything in this file is a pure function: what an override does to a
 * page's metadata, how a part-page pattern is filled in, and what input is
 * accepted. The database and the route sit on top of it.
 */

/** The one override that is a pattern for many pages rather than one page. */
export const PART_TEMPLATE_PATH = "template:part";

/** Search results cut a title near 60 characters and a description near 160. */
export const TITLE_MAX = 70;
export const DESCRIPTION_MAX = 170;

export type PageOverride = {
  metaTitle?: string | null;
  metaDescription?: string | null;
};

export type PartTemplate = {
  titlePattern?: string | null;
  descriptionPattern?: string | null;
};

type MetaText = { title?: string; description?: string };

function present(value: string | null | undefined): string | undefined {
  const text = value?.trim();
  return text ? text : undefined;
}

/**
 * A page's metadata with an override laid over it.
 *
 * Open Graph and the Twitter card are written out as well as the title,
 * because a page that sets `openGraph` replaces the layout's whole object
 * rather than merging into it. Leaving them alone would change the search
 * result and keep the old wording on every shared link.
 *
 * Pages that set no `openGraph` of their own inherit the layout's, so the
 * layout's fields are repeated here for them: without that, an overridden
 * page would lose its share image and site name.
 */
export function applyOverride(
  path: string,
  base: Metadata,
  override: PageOverride | null | undefined,
): Metadata {
  const text: MetaText = {};
  const title = present(override?.metaTitle);
  const description = present(override?.metaDescription);
  if (title) text.title = title;
  if (description) text.description = description;

  if (!title && !description) return base;

  const inheritedOpenGraph = {
    type: "website",
    siteName: site.name,
    locale: "en_AU",
    title: base.title ?? site.title,
    description: base.description ?? site.description,
    url: path,
    images: [{ url: site.logo }],
  };

  return {
    ...base,
    ...text,
    openGraph: {
      ...(base.openGraph ?? inheritedOpenGraph),
      ...text,
    } as Metadata["openGraph"],
    twitter: {
      card: "summary_large_image",
      ...base.twitter,
      ...text,
    } as Metadata["twitter"],
  };
}

export type PartValues = {
  /** The part's display name, e.g. "Alternator". */
  part: string;
  /** Year, make and model. Empty when the feed did not say. */
  vehicle: string;
  stockNo: string;
};

const PLACEHOLDER = /\{(part|vehicle|stockNo)\}/g;

/**
 * One pattern filled in for one part, or null when it cannot be.
 *
 * A pattern that names a value this part does not have is not filled in with
 * a gap: "Used Alternator for  | ..." is worse than the title the page already
 * had. The caller falls back to the built-in wording, which has its own form
 * for a part with no vehicle.
 */
export function renderPartPattern(
  pattern: string | null | undefined,
  values: PartValues,
): string | null {
  const text = present(pattern);
  if (!text) return null;

  let missing = false;
  const filled = text.replace(PLACEHOLDER, (_, name: keyof PartValues) => {
    const value = values[name].trim();
    if (!value) missing = true;
    return value;
  });

  return missing ? null : filled.replace(/\s+/g, " ").trim();
}

/** A part page's title and description: the template's where it applies. */
export function partMeta(
  template: PartTemplate | null | undefined,
  values: PartValues,
  builtIn: { title: string; description: string },
): { title: string; description: string } {
  if (!template) return builtIn;
  return {
    title: renderPartPattern(template.titlePattern, values) ?? builtIn.title,
    description:
      renderPartPattern(template.descriptionPattern, values) ??
      builtIn.description,
  };
}

/* ------------------------------------------------------------------ input */

/**
 * No markup and no control characters. These strings are placed in <title>
 * and in attribute values; React escapes them, so this is not what keeps the
 * page safe. It keeps a pasted tag from showing up verbatim in Google.
 */
const PLAIN = /^[^<>\u0000-\u001f\u007f]*$/;

function text(max: number) {
  return z
    .string()
    .trim()
    .max(max, `must be at most ${max} characters`)
    .regex(PLAIN, "must not contain HTML")
    .optional()
    // The agent sends "" for a description it is leaving alone.
    .transform((value) => (value ? value : undefined));
}

/**
 * A page path as the site writes it: no domain, no query, no trailing slash,
 * and "/" for the home page. One spelling per page, so an override written for
 * a page is always the one that page looks up.
 */
export function isOverridePath(path: string): boolean {
  if (path === PART_TEMPLATE_PATH || path === "/") return true;
  return (
    path.length <= 300 &&
    /^\/[A-Za-z0-9\-._~%/]+$/.test(path) &&
    !path.includes("//") &&
    !path.endsWith("/")
  );
}

const inputSchema = z.object({
  path: z.string().refine(isOverridePath, {
    message: 'must start with "/" (no trailing slash) or be "template:part"',
  }),
  metaTitle: text(TITLE_MAX),
  metaDescription: text(DESCRIPTION_MAX),
  titlePattern: text(TITLE_MAX),
  descriptionPattern: text(DESCRIPTION_MAX),
  changeId: z
    .string()
    .trim()
    .min(1, "is required")
    .max(100)
    .regex(PLAIN, "must not contain HTML"),
});

export type OverrideInput =
  | {
      path: string;
      kind: "page";
      metaTitle?: string;
      metaDescription?: string;
      changeId: string;
    }
  | {
      path: typeof PART_TEMPLATE_PATH;
      kind: "template";
      titlePattern?: string;
      descriptionPattern?: string;
      changeId: string;
    };

export type Parsed =
  | { ok: true; value: OverrideInput }
  | { ok: false; error: string };

/** What a PUT may contain. Anything else is refused with the reason. */
export function parseOverrideInput(body: unknown): Parsed {
  const result = inputSchema.safeParse(body);
  if (!result.success) {
    const issue = result.error.issues[0];
    const field = issue.path.join(".") || "body";
    return { ok: false, error: `${field}: ${issue.message}` };
  }

  const input = result.data;

  if (input.path === PART_TEMPLATE_PATH) {
    if (!input.titlePattern && !input.descriptionPattern) {
      return {
        ok: false,
        error: "template:part needs a titlePattern or a descriptionPattern",
      };
    }
    for (const pattern of [input.titlePattern, input.descriptionPattern]) {
      // A misspelt placeholder would otherwise be printed on 15,000 pages.
      const unknown = pattern
        ?.match(/\{[^}]*\}/g)
        ?.find((token) => !/^\{(part|vehicle|stockNo)\}$/.test(token));
      if (unknown) {
        return { ok: false, error: `unknown placeholder ${unknown}` };
      }
    }
    return {
      ok: true,
      value: {
        path: PART_TEMPLATE_PATH,
        kind: "template",
        titlePattern: input.titlePattern,
        descriptionPattern: input.descriptionPattern,
        changeId: input.changeId,
      },
    };
  }

  if (!input.metaTitle && !input.metaDescription) {
    return { ok: false, error: "needs a metaTitle or a metaDescription" };
  }

  return {
    ok: true,
    value: {
      path: input.path,
      kind: "page",
      metaTitle: input.metaTitle,
      metaDescription: input.metaDescription,
      changeId: input.changeId,
    },
  };
}

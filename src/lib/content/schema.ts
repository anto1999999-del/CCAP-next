/**
 * What a blog post and a gallery vehicle are.
 *
 * These types are shared by the admin, the public pages and the importer, so
 * they carry no database or React specifics: ids are strings, dates are ISO
 * strings, and nothing here imports anything.
 *
 * The two share their SEO fields and their draft handling and differ in what
 * they are about: a post has a body, a vehicle has a set of photographs and the
 * car's identity.
 */

/** Nothing is published by accident: new content starts as a draft. */
export type ContentStatus = "draft" | "published";

export type SeoFields = {
  /** Overrides the title in search results. Falls back to the content's title. */
  metaTitle: string;
  /** The description in search results. About 155 characters is the useful limit. */
  metaDescription: string;
  /** Kept out of search results while true, even when published. */
  noindex: boolean;
  /**
   * The address this had on the old WordPress blog, kept so the redirect map
   * can point the old URL at the new one. Never edited by hand.
   */
  legacyCanonical: string | null;
};

export type ContentImage = {
  /** Path under the media route, e.g. /media/2026/08/engine.webp */
  url: string;
  alt: string;
  width: number | null;
  height: number | null;
};

/** Markdown for anything written here; HTML for the posts imported from WordPress. */
export type BodyFormat = "markdown" | "html";

export type Post = {
  id: string;
  slug: string;
  title: string;
  /** Shown on the index and used as the meta description when none is set. */
  excerpt: string;
  body: string;
  bodyFormat: BodyFormat;
  featuredImage: ContentImage | null;
  status: ContentStatus;
  /** Set the first time it is published, and kept after that. */
  publishedAt: string | null;
  updatedAt: string | null;
  seo: SeoFields;
  /** Free tags, as they came across from WordPress. */
  tags: string[];
};

/**
 * A post without its body, for lists.
 *
 * The index, the sitemap and the related-posts strip all want the same seven
 * fields and none of them want the article itself.
 */
export type PostSummary = Omit<Post, "body" | "bodyFormat">;

export type Vehicle = {
  id: string;
  slug: string;
  /** "2019 KIA CERATO 2.0 SEDAN", as the yard writes it. */
  title: string;
  make: string;
  model: string;
  /** A string, not a number: some are ranges or carry a build month. */
  year: string;
  /** The write-up under the photographs. Optional; many have none. */
  body: string;
  bodyFormat: BodyFormat;
  /** First is the cover shot shown on the gallery index. */
  photos: ContentImage[];
  status: ContentStatus;
  publishedAt: string | null;
  updatedAt: string | null;
  seo: SeoFields;
};

export const EMPTY_SEO: SeoFields = {
  metaTitle: "",
  metaDescription: "",
  noindex: false,
  legacyCanonical: null,
};

/**
 * Turn a title into a URL.
 *
 * A slug is an address: once something is published and linked to, changing it
 * breaks every link and every search result pointing at it. The admin generates
 * one from the title for new content and then leaves it alone.
 */
export function toSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    // Strip accents, so "Citroën" becomes "citroen" rather than "citroan".
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** The title and description search engines will actually show. */
export function resolveSeo(
  content: Pick<Post, "title" | "excerpt" | "seo">,
  siteName: string,
): { title: string; description: string } {
  return {
    title: content.seo.metaTitle.trim() || `${content.title} | ${siteName}`,
    description: content.seo.metaDescription.trim() || content.excerpt,
  };
}

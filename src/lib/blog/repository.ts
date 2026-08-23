import "server-only";
import postsData from "../../../content/blog/posts.json";
import taxonomiesData from "../../../content/blog/taxonomies.json";

/**
 * Where blog content comes from.
 *
 * Backed by the JSON exported from WordPress today. When posts move into the
 * database behind an admin screen, only this file changes — every page and
 * component reads through the functions below, so none of them has to know
 * whether a post came from a file or a collection.
 *
 * That is the whole reason this layer exists, rather than pages importing the
 * JSON directly.
 */

export type BlogTag = { name: string; slug: string };

export type BlogImage = {
  url: string;
  width: number | null;
  height: number | null;
  alt: string;
};

export type BlogPostSeo = {
  metaTitle: string | null;
  metaDescription: string | null;
  /** The URL WordPress published this at, kept for the redirect map. */
  legacyCanonical: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  /**
   * Yoast's robots directives, as an object rather than a string.
   *
   * Checked across the export: all 113 posts are `index, follow`, so nothing
   * needs excluding from search when they move. Kept so that stays verifiable
   * rather than assumed — if a post is ever set to noindex in the admin, this
   * is where the page decides to honour it.
   */
  robots: {
    index?: string;
    follow?: string;
    "max-snippet"?: string;
    "max-image-preview"?: string;
    "max-video-preview"?: string;
  } | null;
};

export type BlogPost = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  contentHtml: string;
  publishedAt: string | null;
  updatedAt: string | null;
  category: string | null;
  categorySlug: string | null;
  tags: BlogTag[];
  featuredImage: BlogImage | null;
  seo: BlogPostSeo;
};

export type Taxonomy = { name: string; slug: string; count: number };

const posts = postsData as BlogPost[];
const taxonomies = taxonomiesData as {
  categories: Taxonomy[];
  tags: Taxonomy[];
};

/** Newest first. */
export function listPosts(): BlogPost[] {
  return posts;
}

export function getPost(slug: string): BlogPost | null {
  return posts.find((post) => post.slug === slug) ?? null;
}

export function listPostSlugs(): string[] {
  return posts.map((post) => post.slug);
}

export function listByCategory(categorySlug: string): BlogPost[] {
  return posts.filter((post) => post.categorySlug === categorySlug);
}

export function listByTag(tagSlug: string): BlogPost[] {
  return posts.filter((post) => post.tags.some((tag) => tag.slug === tagSlug));
}

export function listCategories(): Taxonomy[] {
  return taxonomies.categories;
}

export function listTags(): Taxonomy[] {
  return taxonomies.tags;
}

/**
 * Posts to show beneath an article.
 *
 * Prefers the same category, then fills from the most recent. The old blog had
 * no related posts at all, so every article was a dead end for a reader who
 * finished it.
 */
export function getRelatedPosts(slug: string, limit = 3): BlogPost[] {
  const current = getPost(slug);
  if (!current) return [];

  const sameCategory = posts.filter(
    (post) => post.slug !== slug && post.categorySlug === current.categorySlug,
  );
  const rest = posts.filter(
    (post) => post.slug !== slug && post.categorySlug !== current.categorySlug,
  );

  return [...sameCategory, ...rest].slice(0, limit);
}

import "server-only";
import { rewriteImageUrl, withoutDashes } from "./html";
import postsData from "../../../content/blog/posts.json";
import taxonomiesData from "../../../content/blog/taxonomies.json";

/**
 * Where blog content comes from.
 *
 * Backed by the JSON exported from WordPress today. When posts move into the
 * database behind an admin screen, only this file changes, every page and
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
   * rather than assumed, if a post is ever set to noindex in the admin, this
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

/**
 * The export, with dashes normalised on the way in.
 *
 * Every page reads posts through this module, so doing it here is the one place
 * that guarantees no em dash reaches a template, a meta tag or a JSON-LD block.
 */
const posts = (postsData as BlogPost[]).map((post) => ({
  ...post,
  title: withoutDashes(post.title),
  excerpt: withoutDashes(post.excerpt),
  contentHtml: withoutDashes(post.contentHtml),
  // Images live under public/blog-media now, not on the WordPress host.
  featuredImage: post.featuredImage && {
    ...post.featuredImage,
    url: rewriteImageUrl(post.featuredImage.url),
  },
  seo: {
    ...post.seo,
    metaTitle: post.seo.metaTitle && withoutDashes(post.seo.metaTitle),
    metaDescription:
      post.seo.metaDescription && withoutDashes(post.seo.metaDescription),
    ogTitle: post.seo.ogTitle && withoutDashes(post.seo.ogTitle),
    // The share image is served from here too, not from WordPress.
    ogImage: post.seo.ogImage && rewriteImageUrl(post.seo.ogImage),
    ogDescription:
      post.seo.ogDescription && withoutDashes(post.seo.ogDescription),
  },
}));
const taxonomies = taxonomiesData as {
  categories: Taxonomy[];
  tags: Taxonomy[];
};

/**
 * Every entry, newest first, articles and gallery vehicles together.
 *
 * Most callers want `listArticles()` instead. In WordPress the 26 salvage
 * vehicles are filed as ordinary posts under a "Gallery" category, so anything
 * reading this list unfiltered puts "2019 KIA CERATO 2.0 SEDAN" in among the
 * repair guides.
 */
export function listPosts(): BlogPost[] {
  return posts;
}

/** Articles only, the 87 written posts, excluding gallery vehicles. */
export function listArticles(): BlogPost[] {
  return posts.filter((post) => post.categorySlug !== "gallery");
}

export function getPost(slug: string): BlogPost | null {
  return posts.find((post) => post.slug === slug) ?? null;
}

/** Slugs that get a /blog/[slug] page. Gallery vehicles do not. */
export function listPostSlugs(): string[] {
  return listArticles().map((post) => post.slug);
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

  const articles = listArticles();
  const sameCategory = articles.filter(
    (post) => post.slug !== slug && post.categorySlug === current.categorySlug,
  );
  const rest = articles.filter(
    (post) => post.slug !== slug && post.categorySlug !== current.categorySlug,
  );

  return [...sameCategory,
  ...rest].slice(0, limit);
}

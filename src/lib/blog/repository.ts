import "server-only";
import {
  postBySlug,
  publishedPostSlugs,
  publishedPostSummaries,
} from "../content/store";
import { renderBody } from "../content/render";
import { toSlug, type Post } from "../content/schema";

/**
 * Where blog content comes from.
 *
 * The database, now. It was the WordPress export in JSON files, which was fine
 * to read and impossible to edit; this module was written as a layer so that
 * when that changed, only this file would change. That is what happened.
 *
 * Every function here returns published posts only. Drafts are the admin's
 * business and reach the public pages through no path at all.
 *
 * The shape below is what the pages and components already expect. It is a view
 * over the stored post rather than the stored post itself: the body arrives
 * rendered and sanitised, and the tags carry the slugs the templates want.
 */

export type BlogTag = { name: string; slug: string };

export type BlogImage = {
  url: string;
  width: number | null;
  height: number | null;
  alt: string;
};

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  /** Rendered and sanitised. Safe to place in the document as-is. */
  contentHtml: string;
  publishedAt: string | null;
  updatedAt: string | null;
  tags: BlogTag[];
  featuredImage: BlogImage | null;
  seo: {
    metaTitle: string | null;
    metaDescription: string | null;
    /** Kept out of search results even while the page is public. */
    noindex: boolean;
    /** The image used when the link is shared. The cover shot, when there is one. */
    ogImage: string | null;
    /** Where this lived on WordPress, for the redirect map. */
    legacyCanonical: string | null;
  };
};

function toBlogPost(post: Post): BlogPost {
  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    // An empty body means this came from a list, which does not show one.
    contentHtml: post.body ? renderBody(post.body, post.bodyFormat) : "",
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
    tags: post.tags.map((name) => ({ name, slug: toSlug(name) })),
    featuredImage: post.featuredImage && {
      url: post.featuredImage.url,
      width: post.featuredImage.width,
      height: post.featuredImage.height,
      alt: post.featuredImage.alt,
    },
    seo: {
      metaTitle: post.seo.metaTitle || null,
      metaDescription: post.seo.metaDescription || null,
      noindex: post.seo.noindex,
      ogImage: post.featuredImage?.url ?? null,
      legacyCanonical: post.seo.legacyCanonical,
    },
  };
}

/**
 * Published articles for a list, newest first, without their bodies.
 *
 * `contentHtml` is empty here on purpose. Nothing that shows a list of articles
 * displays one, and rendering eighty-eight of them to build an index took most
 * of a second on every request.
 */
export async function listArticles(): Promise<BlogPost[]> {
  return (await publishedPostSummaries()).map((post) =>
    toBlogPost({ ...post, body: "", bodyFormat: "markdown" }),
  );
}

export async function getPost(slug: string): Promise<BlogPost | null> {
  const post = await postBySlug(slug);
  return post ? toBlogPost(post) : null;
}

/** Slugs that get a /blog/[slug] page. Drafts are not among them. */
export async function listPostSlugs(): Promise<string[]> {
  return publishedPostSlugs();
}

/**
 * Posts to show beneath an article.
 *
 * Ranked by how many tags they share with the one being read, then filled from
 * the most recent. This used to prefer the same category, which sorted nothing:
 * all 87 articles were filed under one category called "Blog".
 *
 * The old blog had no related posts at all, so every article was a dead end for
 * a reader who finished it.
 */
export async function getRelatedPosts(
  slug: string,
  limit = 3,
): Promise<BlogPost[]> {
  const articles = await listArticles();
  const current = articles.find((post) => post.slug === slug);
  if (!current) return [];

  const tags = new Set(current.tags.map((tag) => tag.slug));

  return articles
    .filter((post) => post.slug !== slug)
    .map((post) => ({
      post,
      shared: post.tags.filter((tag) => tags.has(tag.slug)).length,
    }))
    // Stable within a score: the source list is already newest first.
    .sort((a, b) => b.shared - a.shared)
    .slice(0, limit)
    .map((scored) => scored.post);
}

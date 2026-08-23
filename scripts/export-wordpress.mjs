/**
 * Export the WordPress blog into this repository.
 *
 * Usage:  node scripts/export-wordpress.mjs
 *
 * Reads the public WP REST API — no credentials needed, nothing is written to
 * the WordPress site, and it can be re-run safely at any time. The old site
 * stays untouched and serving until the migration is signed off.
 *
 * What it captures, per post: the content, the excerpt, the publish and modified
 * dates, the category and tags, the featured image, and the Yoast SEO fields
 * (meta title, description, canonical, Open Graph). Losing any of those would
 * cost search visibility, which is the thing this migration must not do.
 *
 * Output is JSON in content/blog/, which the app reads through a repository
 * interface. When the posts move into the database behind an admin UI, only
 * that repository changes — the pages and this exporter do not.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const WP = "https://blog.centralcoastautoparts.com.au/wp-json/wp/v2";
const OUT = path.join(process.cwd(), "content", "blog");

/** WP caps per_page at 100. */
const PAGE_SIZE = 100;

async function getJson(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "ccap-migration/1.0" },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return { data: await res.json(), total: Number(res.headers.get("x-wp-total") || 0) };
}

/** Fetch every page of a collection. */
async function getAll(resource, extra = "") {
  const items = [];
  for (let page = 1; ; page += 1) {
    const url = `${WP}/${resource}?per_page=${PAGE_SIZE}&page=${page}${extra}`;
    const { data } = await getJson(url);
    if (!Array.isArray(data) || data.length === 0) break;
    items.push(...data);
    if (data.length < PAGE_SIZE) break;
  }
  return items;
}

/**
 * Keep only what the new site needs.
 *
 * The raw payload carries a lot that does not survive the move — WordPress
 * template names, ping status, class lists, `_links`. Storing it would mean
 * carrying WordPress's shape into a site that no longer runs WordPress.
 */
function toPost(wp, mediaById, categoriesById, tagsById) {
  const yoast = wp.yoast_head_json ?? {};
  const featured = mediaById.get(wp.featured_media);

  return {
    id: wp.id,
    slug: wp.slug,
    title: decodeEntities(wp.title?.rendered ?? ""),
    excerpt: stripTags(decodeEntities(wp.excerpt?.rendered ?? "")).trim(),
    /** Gutenberg block markup, converted at render time. */
    contentHtml: wp.content?.rendered ?? "",
    publishedAt: wp.date_gmt ? `${wp.date_gmt}Z` : null,
    updatedAt: wp.modified_gmt ? `${wp.modified_gmt}Z` : null,
    category: categoriesById.get(wp.categories?.[0])?.name ?? null,
    categorySlug: categoriesById.get(wp.categories?.[0])?.slug ?? null,
    tags: (wp.tags ?? [])
      .map((id) => tagsById.get(id))
      .filter(Boolean)
      .map((t) => ({ name: t.name, slug: t.slug })),
    featuredImage: featured
      ? {
          url: featured.source_url,
          width: featured.media_details?.width ?? null,
          height: featured.media_details?.height ?? null,
          alt: featured.alt_text || "",
        }
      : null,
    seo: {
      metaTitle: yoast.title ?? null,
      metaDescription: yoast.description ?? null,
      /** The old canonical, kept so the redirect map can be checked against it. */
      legacyCanonical: yoast.canonical ?? null,
      ogTitle: yoast.og_title ?? null,
      ogDescription: yoast.og_description ?? null,
      ogImage: yoast.og_image?.[0]?.url ?? null,
      robots: yoast.robots ?? null,
    },
  };
}

function stripTags(html) {
  return html.replace(/<[^>]*>/g, "");
}

/** WordPress returns HTML entities in titles and excerpts. */
function decodeEntities(text) {
  const named = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#039;": "'",
    "&#8217;": "’",
    "&#8216;": "‘",
    "&#8220;": "“",
    "&#8221;": "”",
    "&#8211;": "–",
    "&#8212;": "—",
    "&hellip;": "…",
    "&nbsp;": " ",
  };
  return text
    .replace(/&#\d+;|&[a-z]+;/gi, (m) => named[m] ?? m)
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

async function main() {
  console.log("Reading the WordPress API…");

  const [posts, pages, media, categories, tags] = await Promise.all([
    getAll("posts", "&status=publish"),
    getAll("pages", "&status=publish"),
    getAll("media"),
    getAll("categories"),
    getAll("tags"),
  ]);

  console.log(
    `  ${posts.length} posts, ${pages.length} pages, ${media.length} media, ` +
      `${categories.length} categories, ${tags.length} tags`,
  );

  const mediaById = new Map(media.map((m) => [m.id, m]));
  const categoriesById = new Map(categories.map((c) => [c.id, c]));
  const tagsById = new Map(tags.map((t) => [t.id, t]));

  const exported = posts
    .map((p) => toPost(p, mediaById, categoriesById, tagsById))
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));

  await mkdir(OUT, { recursive: true });

  await writeFile(
    path.join(OUT, "posts.json"),
    JSON.stringify(exported, null, 2),
    "utf8",
  );

  await writeFile(
    path.join(OUT, "taxonomies.json"),
    JSON.stringify(
      {
        categories: categories.map((c) => ({
          name: c.name,
          slug: c.slug,
          count: c.count,
        })),
        tags: tags.map((t) => ({ name: t.name, slug: t.slug, count: t.count })),
      },
      null,
      2,
    ),
    "utf8",
  );

  // Every image the posts reference, so the download step knows its work list
  // and the redirect map can cover the old media URLs.
  const referenced = new Set();
  for (const post of exported) {
    if (post.featuredImage?.url) referenced.add(post.featuredImage.url);
    for (const [, url] of post.contentHtml.matchAll(/<img[^>]+src="([^"]+)"/g)) {
      referenced.add(url);
    }
  }

  await writeFile(
    path.join(OUT, "media.json"),
    JSON.stringify(
      {
        referencedByPosts: [...referenced].sort(),
        libraryTotal: media.length,
      },
      null,
      2,
    ),
    "utf8",
  );

  const missingDescription = exported.filter((p) => !p.seo.metaDescription);
  const missingTitle = exported.filter((p) => !p.seo.metaTitle);

  console.log(`\nWrote ${exported.length} posts to content/blog/`);
  console.log(`  images referenced by posts : ${referenced.size} of ${media.length} in the library`);
  console.log(`  posts without a meta title : ${missingTitle.length}`);
  console.log(`  posts without a meta desc  : ${missingDescription.length}`);
}

main().catch((error) => {
  console.error("Export failed:", error.message);
  process.exitCode = 1;
});

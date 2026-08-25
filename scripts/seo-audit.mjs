/**
 * Check every public page against the on-page rules.
 *
 *   node scripts/seo-audit.mjs [origin]
 *
 * Crawls the site's own sitemap plus the catalogue, and reports per page:
 * title, description, canonical, headings, images without alt text, word
 * count and structured data. Findings are printed grouped by rule, because a
 * list of 24,000 pages is not something anybody reads.
 *
 * Written as a script rather than a test so it can be run against the live
 * site after a deploy, not only against a build.
 */

const ORIGIN = process.argv[2] ?? "http://localhost:3210";

/** What Google actually shows before truncating, measured in characters. */
const TITLE_MAX = 60;
const TITLE_MIN = 20;
const DESCRIPTION_MAX = 160;
const DESCRIPTION_MIN = 70;
/** Below this a page reads as thin to a crawler and to a person. */
const THIN_WORDS = 250;

function tag(html, pattern) {
  return html.match(pattern)?.[1]?.trim() ?? null;
}

function decode(text) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function inspect(url, html) {
  const title = decode(
    tag(html, /<title[^>]*>([\s\S]*?)<\/title>/i) ?? "",
  );
  const description = decode(
    tag(html, /<meta name="description" content="([^"]*)"/i) ?? "",
  );
  const canonical = tag(html, /<link rel="canonical" href="([^"]*)"/i);
  const robots = tag(html, /<meta name="robots" content="([^"]*)"/i);
  const ogTitle = tag(html, /<meta property="og:title" content="([^"]*)"/i);
  const ogImage = tag(html, /<meta property="og:image[^"]*" content="([^"]*)"/i);

  const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) =>
    decode(m[1].replace(/<[^>]+>/g, "").trim()),
  );
  const h2s = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].length;

  const images = [...html.matchAll(/<img\b[^>]*>/gi)];
  const missingAlt = images.filter((m) => !/\salt="/i.test(m[0])).length;
  const emptyAlt = images.filter((m) => /\salt=""/i.test(m[0])).length;

  const schemas = [
    ...html.matchAll(/"@type"\s*:\s*"([^"]+)"/g),
  ].map((m) => m[1]);

  // Body text only: scripts, styles and markup stripped.
  const words = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ").length;

  return {
    url,
    title,
    description,
    canonical,
    robots,
    ogTitle,
    ogImage,
    h1s,
    h2s,
    images: images.length,
    missingAlt,
    emptyAlt,
    schemas: [...new Set(schemas)],
    words,
  };
}

async function urlsFromSitemap(origin) {
  const urls = new Set();

  /*
    Through robots.txt, the way a crawler finds them, so this checks the path a
    search engine actually takes rather than one we know works.
  */
  const robots = await fetch(`${origin}/robots.txt`).then((r) => r.text());
  const listed = [...robots.matchAll(/^Sitemap:\s*(\S+)/gim)].map((m) => m[1]);
  const files = listed.filter((url) => !url.endsWith("/sitemap.xml"));

  // File 0 is the site's own pages. The rest are the 24,000 catalogue pages,
  // which are checked by sampling rather than one at a time.
  for (const file of files) {
    const path = new URL(file).pathname;
    const xml = await fetch(`${origin}${path}`).then((r) => r.text());
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

    if (path.endsWith("/0.xml")) {
      for (const loc of locs) urls.add(new URL(loc).pathname);
    } else {
      // Ten from each catalogue file is enough to prove the template.
      for (const loc of locs.slice(0, 10)) urls.add(new URL(loc).pathname);
    }
  }

  return [...urls];
}

const RULES = [
  ["Missing title", (p) => !p.title],
  ["Title over 60 characters", (p) => p.title.length > TITLE_MAX],
  ["Title under 20 characters", (p) => p.title && p.title.length < TITLE_MIN],
  ["Missing meta description", (p) => !p.description],
  ["Description over 160 characters", (p) => p.description.length > DESCRIPTION_MAX],
  ["Description under 70 characters", (p) => p.description && p.description.length < DESCRIPTION_MIN],
  ["Missing canonical", (p) => !p.canonical],
  ["No H1", (p) => p.h1s.length === 0],
  ["More than one H1", (p) => p.h1s.length > 1],
  ["No H2 at all", (p) => p.h2s === 0],
  ["Images with no alt attribute", (p) => p.missingAlt > 0],
  ["Missing og:image", (p) => !p.ogImage],
  ["No structured data", (p) => p.schemas.length === 0],
  ["Thin content", (p) => p.words < THIN_WORDS],
];

async function main() {
  console.log(`Auditing ${ORIGIN}\n`);

  const paths = await urlsFromSitemap(ORIGIN);
  console.log(`${paths.length} pages to check\n`);

  const pages = [];
  for (const path of paths) {
    try {
      const response = await fetch(`${ORIGIN}${path}`);
      if (!response.ok) {
        console.log(`  ${response.status} ${path}`);
        continue;
      }
      pages.push(inspect(path, await response.text()));
    } catch (error) {
      console.log(`  FAILED ${path}: ${error.message}`);
    }
  }

  console.log(`${pages.length} checked\n${"=".repeat(70)}\n`);

  for (const [name, fails] of RULES) {
    const hits = pages.filter(fails);
    if (hits.length === 0) continue;

    console.log(`\n${name}: ${hits.length}`);
    for (const page of hits.slice(0, 8)) {
      const detail =
        name.includes("Title") ? `${page.title.length}ch "${page.title}"`
        : name.includes("escription") ? `${page.description.length}ch`
        : name.includes("H1") ? JSON.stringify(page.h1s)
        : name.includes("alt") ? `${page.missingAlt} of ${page.images}`
        : name.includes("Thin") ? `${page.words} words`
        : "";
      console.log(`   ${page.url}  ${detail}`);
    }
    if (hits.length > 8) console.log(`   ... and ${hits.length - 8} more`);
  }

  // Duplicates matter as much as absences: two pages with one title compete.
  for (const field of ["title", "description"]) {
    const seen = new Map();
    for (const page of pages) {
      if (!page[field]) continue;
      seen.set(page[field], [...(seen.get(page[field]) ?? []), page.url]);
    }
    const duplicates = [...seen.entries()].filter(([, list]) => list.length > 1);
    if (duplicates.length === 0) continue;

    console.log(`\nDuplicate ${field}: ${duplicates.length} sets`);
    for (const [value, list] of duplicates.slice(0, 5)) {
      console.log(`   "${value.slice(0, 60)}" on ${list.length}: ${list.slice(0, 3).join(", ")}`);
    }
  }

  console.log(`\n${"=".repeat(70)}`);
  console.log("Structured data in use:");
  const types = new Map();
  for (const page of pages) {
    for (const type of page.schemas) types.set(type, (types.get(type) ?? 0) + 1);
  }
  for (const [type, count] of [...types.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`   ${String(count).padStart(4)}  ${type}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

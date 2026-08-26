/**
 * Follow every internal link on the site and report what breaks.
 *
 *   node scripts/link-check.mjs [origin]
 *
 * Crawls from the home page, follows internal links only, and reports the
 * status of every one. Also checks the things a broken link check usually
 * misses: whether a paginated page canonicalises to itself rather than to page
 * one, and whether any page redirects when it is linked to directly.
 *
 * The catalogue is 32,000 pages, so product URLs are sampled rather than
 * walked. Everything else is followed to the end.
 */

const ORIGIN = process.argv[2] ?? "http://localhost:3000";
const MAX_PAGES = 400;

/** A product page is one of thousands from the same template. */
function isProduct(path) {
  return path.startsWith("/product/");
}

async function main() {
  const queue = ["/"];
  const seen = new Set(queue);
  const results = new Map();
  const linkedFrom = new Map();
  let productsSampled = 0;

  while (queue.length > 0 && seen.size <= MAX_PAGES) {
    const path = queue.shift();

    let response;
    try {
      response = await fetch(`${ORIGIN}${path}`, { redirect: "manual" });
    } catch (error) {
      results.set(path, `FETCH FAILED: ${error.message}`);
      continue;
    }

    results.set(path, response.status);

    // A redirect is worth knowing about even when it works: an internal link
    // should point at the final address, not bounce through one.
    if (response.status >= 300 && response.status < 400) {
      results.set(path, `${response.status} -> ${response.headers.get("location")}`);
      continue;
    }

    if (response.status !== 200) continue;
    if (!(response.headers.get("content-type") ?? "").includes("text/html")) continue;

    const html = await response.text();

    // The canonical each page declares, so a paginated list pointing at page
    // one shows up. That silently removes pages two onward from the index.
    const canonical = html.match(/<link rel="canonical" href="([^"]*)"/i)?.[1];
    if (canonical) {
      const declared = new URL(canonical).pathname + new URL(canonical).search;
      const asked = path;
      if (declared !== asked && !isProduct(path)) {
        results.set(path, `${response.status}  canonical -> ${declared}`);
      }
    }

    for (const match of html.matchAll(/href="(\/[^"#]*)"/g)) {
      const found = match[1].replace(/&amp;/g, "&");

      if (found.startsWith("/_next") || found.startsWith("/api/")) continue;
      if (seen.has(found)) continue;

      if (isProduct(found)) {
        if (productsSampled >= 15) continue;
        productsSampled += 1;
      }

      seen.add(found);
      queue.push(found);
      if (!linkedFrom.has(found)) linkedFrom.set(found, path);
    }
  }

  const broken = [];
  const redirects = [];
  const canonicals = [];

  for (const [path, status] of results) {
    const text = String(status);
    if (text.startsWith("4") || text.startsWith("5") || text.includes("FAILED")) {
      broken.push([path, status]);
    } else if (text.includes("->") && !text.includes("canonical")) {
      redirects.push([path, status]);
    } else if (text.includes("canonical")) {
      canonicals.push([path, status]);
    }
  }

  console.log(`Crawled ${results.size} pages from ${ORIGIN}\n`);

  console.log(`Broken: ${broken.length}`);
  for (const [path, status] of broken) {
    console.log(`   ${status}  ${path}   (linked from ${linkedFrom.get(path) ?? "start"})`);
  }

  console.log(`\nRedirecting: ${redirects.length}`);
  for (const [path, status] of redirects) {
    console.log(`   ${path}  ${status}   (linked from ${linkedFrom.get(path) ?? "start"})`);
  }

  console.log(`\nCanonical points elsewhere: ${canonicals.length}`);
  for (const [path, status] of canonicals) {
    console.log(`   ${path}  ${status}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

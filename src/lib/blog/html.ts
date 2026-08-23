/**
 * Prepare WordPress-rendered HTML for display on this site.
 *
 * Two jobs: strip the markup that only meant something inside WordPress, and
 * refuse anything that could execute.
 *
 * The sanitising is not theatre. The exported content is clean today, but it
 * checked, and the cloaking attack of 10 August lived in a must-use plugin at
 * the serving layer rather than in the posts themselves. But this same function
 * will render whatever an admin user pastes into the editor later, and the
 * whole point of leaving WordPress is to stop content being able to run code.
 */

/** Tags a post may legitimately contain. Everything else is unwrapped. */
const ALLOWED_TAGS = new Set([
  "p", "br", "hr", "strong", "b", "em", "i", "u", "s", "mark", "small", "sub", "sup",
  "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li",
  "blockquote", "q", "cite",
  "a", "img", "figure", "figcaption",
  "table", "thead", "tbody", "tfoot", "tr", "th", "td",
  "code", "pre", "span", "div",
]);

/** Attributes worth keeping, per tag. Anything not listed is dropped. */
const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "title", "rel", "target"]),
  img: new Set(["src", "alt", "width", "height", "loading", "decoding"]),
  th: new Set(["colspan", "rowspan", "scope"]),
  td: new Set(["colspan", "rowspan"]),
};

const BLOG_HOSTS = [
  "blog.centralcoastautoparts.com.au",
  "www.blog.centralcoastautoparts.com.au",
];

/**
 * Rewrite a link that pointed at the old WordPress blog to its new path.
 *
 * 51 links across the posts point at the blog subdomain. They would still work
 * through the redirects, but every one would cost the reader a round trip and
 * leak a redirect chain into the crawl. Internal links should be internal.
 */
export function rewriteInternalLink(href: string): string {
  try {
    const url = new URL(href, "https://blog.centralcoastautoparts.com.au");
    if (!BLOG_HOSTS.includes(url.hostname)) return href;

    const path = url.pathname.replace(/\/+$/, "");
    if (!path || path === "") return "/blog";
    // WordPress served posts at the root of the subdomain; they live under
    // /blog here.
    return `/blog${path}${url.search}${url.hash}`;
  } catch {
    return href;
  }
}

/**
 * Point an image at our own copy.
 *
 * Uploads keep their WordPress path so the old URLs can be redirected to the
 * new ones one-for-one, and so this mapping stays obvious to anyone reading it.
 */
export function rewriteImageUrl(src: string): string {
  try {
    const url = new URL(src, "https://blog.centralcoastautoparts.com.au");
    if (!BLOG_HOSTS.includes(url.hostname)) return src;
    return url.pathname.replace(/^\/wp-content\/uploads\//, "/blog-media/");
  } catch {
    return src;
  }
}

/**
 * Clean one post body.
 *
 * Deliberately a string transform rather than a DOM parse: this runs on the
 * server at build time, where there is no DOM, and the input is a known shape
 * rather than arbitrary web content.
 */
/**
 * Take the em and en dashes out of imported copy.
 *
 * The owner does not want them anywhere on the site, and 197 of them came
 * across in the WordPress posts. Applied when content is loaded rather than
 * edited into the export, so re-running the exporter cannot bring them back.
 *
 * A dash between two numbers is a range, so that becomes a hyphen. Everywhere
 * else the dash is doing the job of a comma, so it becomes one.
 */
export function withoutDashes(text: string): string {
  return (
    text
      .replace(/(?<=\d)\s*[\u2013\u2014]\s*(?=\d)/g, "-")
      .replace(/\s*[\u2013\u2014]\s*/g, ", ")
      // A dash that ended a sentence leaves a comma stranded before the stop.
      .replace(/,\s*([.!?,;:])/g, "$1")
      // ...or stranded against the tag that followed it.
      .replace(/,\s*(<\/?(?:p|h[1-6]|li|td|th|div|figure|blockquote)\b)/gi, "$1")
      .replace(/([,;:])\s*,\s*/g, "$1 ")
  );
}

export function cleanPostHtml(html: string): string {
  let out = html;

  // Anything that can execute goes first, contents and all.
  out = out.replace(/<(script|style|iframe|object|embed|form)\b[\s\S]*?<\/\1>/gi, "");
  out = out.replace(/<(script|iframe|object|embed|form)\b[^>]*\/?>/gi, "");

  // Elementor wrappers and its inline icon SVGs carry no meaning here.
  out = out.replace(/<svg\b[\s\S]*?<\/svg>/gi, "");

  out = out.replace(
    /<([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g,
    (whole, rawTag: string, rawAttrs: string) => {
      const tag = rawTag.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) return "";

      const allowed = ALLOWED_ATTRS[tag];
      if (!allowed) return `<${tag}>`;

      const kept: string[] = [];
      for (const match of rawAttrs.matchAll(
        /([a-zA-Z-]+)\s*=\s*"([^"]*)"/g,
      )) {
        const name = match[1].toLowerCase();
        let value = match[2];
        if (!allowed.has(name)) continue;

        // No inline handlers, and no javascript: or data: URLs, ever.
        if (name.startsWith("on")) continue;
        if (/^\s*(javascript|data|vbscript):/i.test(value)) continue;

        if (tag === "a" && name === "href") value = rewriteInternalLink(value);
        if (tag === "img" && name === "src") value = rewriteImageUrl(value);

        kept.push(`${name}="${escapeAttribute(value)}"`);
      }

      // Images are lazy by default; the post body is below the fold.
      if (tag === "img") {
        kept.push('loading="lazy"', 'decoding="async"');
      }

      // Outbound links open in a new tab and cannot reach back into this page.
      if (tag === "a") {
        const href = kept.find((a) => a.startsWith("href="));
        if (href && /https?:\/\//.test(href) && !href.includes("centralcoastautoparts")) {
          kept.push('target="_blank"', 'rel="noopener noreferrer"');
        }
      }

      return `<${tag}${kept.length ? " " + kept.join(" ") : ""}>`;
    },
  );

  // Closing tags for anything not allowed.
  out = out.replace(/<\/([a-zA-Z][a-zA-Z0-9]*)>/g, (whole, rawTag: string) =>
    ALLOWED_TAGS.has(rawTag.toLowerCase()) ? `</${rawTag.toLowerCase()}>` : "",
  );

  // WordPress leaves runs of blank lines between blocks.
  out = out.replace(/\n{3,}/g, "\n\n").trim();

  return out;
}

function escapeAttribute(value: string): string {
  return value.replace(/&(?!(#\d+|#x[0-9a-f]+|[a-z]+);)/gi, "&amp;").replace(/"/g, "&quot;");
}

/** Rough reading time, for the post header. */
export function readingTimeMinutes(html: string): number {
  const words = html
    .replace(/<[^>]+>/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

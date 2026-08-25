import { cleanPostHtml } from "../blog/html";
import type { BodyFormat } from "./schema";

/**
 * Turning a stored body into HTML for the page.
 *
 * Two formats, one function, because the editor's preview and the public page
 * must agree. A preview that renders differently from the page is worse than no
 * preview: it tells the writer their article is fine when it is not.
 *
 * Both paths end at the same sanitiser. Markdown can contain raw HTML, so
 * "it came from markdown" is not a reason to trust it, and the imported
 * WordPress articles are HTML by definition.
 */

/**
 * A small markdown renderer.
 *
 * Deliberately small: headings, bold, italic, links, images, lists, quotes,
 * code and paragraphs. That is what the toolbar can produce and what a yard
 * writing about used parts needs. A full markdown library is a large dependency
 * and a wider attack surface for a feature nobody asked for.
 *
 * Anything it does not understand falls through as text and is escaped, so an
 * unsupported construct shows as what was typed rather than disappearing.
 */
function markdownToHtml(markdown: string): string {
  const escaped = markdown
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const lines = escaped.split(/\r?\n/);
  const html: string[] = [];

  let inList = false;
  let inQuote = false;
  let inCode = false;
  let paragraph: string[] = [];

  const closeParagraph = () => {
    if (paragraph.length > 0) {
      html.push(`<p>${inline(paragraph.join(" "))}</p>`);
      paragraph = [];
    }
  };

  const closeBlocks = () => {
    closeParagraph();
    if (inList) {
      html.push("</ul>");
      inList = false;
    }
    if (inQuote) {
      html.push("</blockquote>");
      inQuote = false;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      closeBlocks();
      html.push(inCode ? "</code></pre>" : "<pre><code>");
      inCode = !inCode;
      continue;
    }

    if (inCode) {
      html.push(line);
      continue;
    }

    if (trimmed === "") {
      closeBlocks();
      continue;
    }

    const heading = trimmed.match(/^(#{2,4})\s+(.*)$/);
    if (heading) {
      closeBlocks();
      const level = heading[1].length;
      html.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      closeParagraph();
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${inline(trimmed.replace(/^[-*]\s+/, ""))}</li>`);
      continue;
    }

    if (trimmed.startsWith("&gt; ")) {
      closeParagraph();
      if (!inQuote) {
        html.push("<blockquote>");
        inQuote = true;
      }
      html.push(`<p>${inline(trimmed.slice(5))}</p>`);
      continue;
    }

    if (inList || inQuote) closeBlocks();
    paragraph.push(trimmed);
  }

  closeBlocks();
  if (inCode) html.push("</code></pre>");

  return html.join("\n");
}

/** Bold, italic, code, images and links, inside a line. */
function inline(text: string): string {
  return text
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img src="$2" alt="$1" loading="lazy" />')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[\s(])_([^_]+)_/g, "$1<em>$2</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

export function renderBody(body: string, format: BodyFormat): string {
  const html = format === "markdown" ? markdownToHtml(body) : body;

  // Sanitised either way. Markdown can carry raw HTML, so where it came from is
  // not a reason to trust it.
  return cleanPostHtml(html);
}

/**
 * The first plain words of a body, for an excerpt nobody has written.
 *
 * An article with no excerpt should still say something on the index and in
 * search results, rather than showing its title twice.
 */
export function excerptFrom(body: string, format: BodyFormat, limit = 200): string {
  const text = renderBody(body, format)
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= limit) return text;

  // Cut at a word, not mid-word, so the tail is not a fragment.
  const cut = text.slice(0, limit);
  return `${cut.slice(0, cut.lastIndexOf(" "))}...`;
}

"use client";

import { useRef, useState } from "react";
import { uploadImage } from "./ImagePicker";
import { renderBody } from "@/lib/content/render";
import type { BodyFormat } from "@/lib/content/schema";

/**
 * Writing the body of an article or a vehicle write-up.
 *
 * Markdown with buttons, not a what-you-see-is-what-you-get editor. Two reasons,
 * and they are practical rather than ideological.
 *
 * The 87 imported articles are WordPress HTML, with tables and layout that a
 * WYSIWYG round-trip mangles. These are live pages with live rankings, so
 * anything that risks quietly rewriting them is the wrong tool.
 *
 * And the buttons mean nobody has to know markdown. Select a word, press Bold.
 * Press Image and it uploads and drops itself in. The preview shows exactly what
 * the page will show, because it runs the same renderer the page does.
 *
 * An imported HTML article stays HTML and is edited as HTML. It is not silently
 * converted.
 */

type Insert = {
  label: string;
  title: string;
  /** Wrapped around the selection, or inserted with the cursor between them. */
  before: string;
  after?: string;
  /** Used when nothing is selected, so a button never inserts empty syntax. */
  placeholder?: string;
  /** Applied at the start of the line rather than around the selection. */
  linePrefix?: boolean;
};

const MARKDOWN_TOOLS: Insert[] = [
  { label: "Bold", title: "Bold", before: "**", after: "**", placeholder: "bold text" },
  { label: "Italic", title: "Italic", before: "_", after: "_", placeholder: "italic text" },
  { label: "H2", title: "Heading", before: "## ", placeholder: "Heading", linePrefix: true },
  { label: "H3", title: "Sub-heading", before: "### ", placeholder: "Sub-heading", linePrefix: true },
  { label: "List", title: "Bulleted list", before: "- ", placeholder: "First point", linePrefix: true },
  { label: "Link", title: "Link", before: "[", after: "](https://)", placeholder: "link text" },
  { label: "Quote", title: "Quote", before: "> ", placeholder: "Quoted text", linePrefix: true },
];

export default function BodyEditor({
  value,
  format,
  onChange,
}: {
  value: string;
  format: BodyFormat;
  onChange: (value: string) => void;
}) {
  const area = useRef<HTMLTextAreaElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isHtml = format === "html";

  function insert(tool: Insert) {
    const element = area.current;
    if (!element) return;

    const { selectionStart, selectionEnd } = element;
    const selected = value.slice(selectionStart, selectionEnd);
    const text = selected || tool.placeholder || "";

    let replacement: string;
    let caret: number;

    if (tool.linePrefix) {
      // Applied from the start of the line, so a heading is a heading rather
      // than a hash in the middle of a sentence.
      const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
      replacement =
        value.slice(0, lineStart) +
        tool.before +
        value.slice(lineStart, selectionStart) +
        text +
        value.slice(selectionEnd);
      caret = lineStart + tool.before.length + text.length;
    } else {
      replacement =
        value.slice(0, selectionStart) +
        tool.before +
        text +
        (tool.after ?? "") +
        value.slice(selectionEnd);
      caret = selectionStart + tool.before.length + text.length;
    }

    onChange(replacement);

    // Put the cursor back where the writer expects it, after React re-renders.
    requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(caret, caret);
    });
  }

  async function addImage(chosen: File | undefined) {
    if (!chosen) return;

    setBusy(true);
    setError(null);

    const result = await uploadImage(chosen);

    if (result.ok) {
      const element = area.current;
      const at = element?.selectionStart ?? value.length;
      const markup = isHtml
        ? `\n<img src="${result.image.url}" alt="" />\n`
        : `\n![](${result.image.url})\n`;

      onChange(value.slice(0, at) + markup + value.slice(at));
    } else {
      setError(result.message);
    }

    setBusy(false);
    if (file.current) file.current.value = "";
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        {!isHtml &&
          MARKDOWN_TOOLS.map((tool) => (
            <button
              key={tool.label}
              type="button"
              title={tool.title}
              onClick={() => insert(tool)}
              className="border-line rounded-lg border px-2.5 py-1.5 text-xs font-semibold text-gray-300 transition-colors hover:border-white/30 hover:text-white"
            >
              {tool.label}
            </button>
          ))}

        <button
          type="button"
          onClick={() => file.current?.click()}
          disabled={busy}
          className="border-line rounded-lg border px-2.5 py-1.5 text-xs font-semibold text-gray-300 transition-colors hover:border-white/30 hover:text-white disabled:opacity-60"
        >
          {busy ? "Uploading..." : "Insert image"}
        </button>

        <button
          type="button"
          onClick={() => setPreview((current) => !current)}
          aria-pressed={preview}
          className={`ml-auto rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
            preview
              ? "border-brand bg-brand text-white"
              : "border-line text-gray-300 hover:border-white/30 hover:text-white"
          }`}
        >
          Preview
        </button>
      </div>

      {isHtml && (
        <p className="mb-2 text-xs text-gray-500">
          This article came across from WordPress, so it is HTML. Editing it as
          HTML keeps its tables and layout exactly as they are.
        </p>
      )}

      {preview ? (
        <div
          className="blog-body border-line min-h-[420px] rounded-xl border bg-[#0b0b0d] p-5"
          dangerouslySetInnerHTML={{ __html: renderBody(value, format) }}
        />
      ) : (
        <textarea
          ref={area}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          spellCheck
          className="focus:border-brand border-line min-h-[420px] w-full rounded-xl border bg-[#0b0b0d] p-4 font-mono text-sm leading-relaxed text-white focus:outline-none"
          placeholder={
            isHtml
              ? "<p>Write the article here.</p>"
              : "Write the article here.\n\nUse the buttons above, or type markdown directly."
          }
        />
      )}

      {error && (
        <p role="alert" className="text-brand-text mt-2 text-sm">
          {error}
        </p>
      )}

      <input
        ref={file}
        type="file"
        accept="image/webp,image/jpeg,image/png,image/avif,image/gif"
        onChange={(event) => addImage(event.target.files?.[0])}
        className="hidden"
      />
    </div>
  );
}

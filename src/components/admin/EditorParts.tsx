"use client";

import type { SeoFields } from "@/lib/content/schema";

/**
 * The small pieces every content editor is built from.
 *
 * Kept together so a field on the blog editor and the same field on the gallery
 * editor cannot drift apart, which is how two forms that were meant to match end
 * up looking like two different products.
 */

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold tracking-wider text-gray-400 uppercase">
        {label}
      </span>
      {children}
      {error ? (
        <span className="text-brand-text mt-1.5 block text-xs">{error}</span>
      ) : (
        hint && <span className="mt-1.5 block text-xs text-gray-500">{hint}</span>
      )}
    </label>
  );
}

export const inputClass =
  "focus:border-brand border-line w-full rounded-xl border bg-[#0b0b0d] px-4 py-2.5 text-sm text-white placeholder-gray-600 transition-colors focus:outline-none";

export function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-line bg-card rounded-2xl border p-5 md:p-6">
      <h2 className="text-sm font-bold tracking-wide text-white uppercase">
        {title}
      </h2>
      {description && (
        <p className="mt-1 mb-5 text-xs text-gray-500">{description}</p>
      )}
      <div className={description ? "space-y-5" : "mt-5 space-y-5"}>{children}</div>
    </section>
  );
}

/**
 * The search engine fields.
 *
 * Both editors show the same three, because the rules Google applies do not
 * change between an article and a car. The counters are advisory: search engines
 * truncate rather than reject, so a long description is a warning and not an
 * error.
 */
export function SeoPanel({
  seo,
  fallbackTitle,
  fallbackDescription,
  path,
  errors,
  onChange,
}: {
  seo: Pick<SeoFields, "metaTitle" | "metaDescription" | "noindex">;
  /** What search engines show when the field is left empty. */
  fallbackTitle: string;
  fallbackDescription: string;
  /** The address this will live at, shown the way a result looks. */
  path: string;
  errors: Record<string, string>;
  onChange: (seo: Pick<SeoFields, "metaTitle" | "metaDescription" | "noindex">) => void;
}) {
  const title = seo.metaTitle.trim() || fallbackTitle;
  const description = seo.metaDescription.trim() || fallbackDescription;

  return (
    <Panel
      title="Search engines"
      description="How this looks in Google. Leave a field empty and the page's own title and summary are used."
    >
      <div className="rounded-xl border border-white/5 bg-[#0b0b0d] p-4">
        <p className="truncate text-xs text-gray-500">
          centralcoastautoparts.com.au{path}
        </p>
        <p className="mt-1 truncate text-base text-[#8ab4f8]">
          {title || "Untitled"}
        </p>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-400">
          {description || "No description yet."}
        </p>
      </div>

      <Field
        label="Search title"
        hint={`${seo.metaTitle.length} of about 60 characters`}
        error={errors["seo.metaTitle"]}
      >
        <input
          value={seo.metaTitle}
          onChange={(event) =>
            onChange({ ...seo, metaTitle: event.target.value })
          }
          placeholder={fallbackTitle}
          className={inputClass}
        />
      </Field>

      <Field
        label="Search description"
        hint={`${seo.metaDescription.length} of about 155 characters`}
        error={errors["seo.metaDescription"]}
      >
        <textarea
          value={seo.metaDescription}
          onChange={(event) =>
            onChange({ ...seo, metaDescription: event.target.value })
          }
          rows={3}
          placeholder={fallbackDescription}
          className={`${inputClass} resize-y`}
        />
      </Field>

      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={seo.noindex}
          onChange={(event) => onChange({ ...seo, noindex: event.target.checked })}
          className="accent-brand mt-0.5 h-4 w-4"
        />
        <span>
          <span className="block text-sm font-semibold text-white">
            Keep this out of Google
          </span>
          <span className="block text-xs text-gray-500">
            The page stays on the site and stays linkable. It is only hidden from
            search results.
          </span>
        </span>
      </label>
    </Panel>
  );
}

/** Draft or published, said plainly rather than as a coloured dot. */
export function StatusPill({ status }: { status: "draft" | "published" }) {
  return status === "published" ? (
    <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold tracking-wide text-emerald-400 uppercase">
      Published
    </span>
  ) : (
    <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-bold tracking-wide text-amber-400 uppercase">
      Draft
    </span>
  );
}

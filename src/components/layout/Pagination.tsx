import Link from "next/link";

/**
 * Paging through a list, anywhere on the site.
 *
 * Real links, not buttons: each page has its own URL, so it can be shared,
 * crawled, opened in a new tab and reached with the back button. The old
 * catalogue kept the page number in component state, which meant page seven of
 * a filtered catalogue could not be linked to at all.
 *
 * Written for the catalogue and now used by the blog, the gallery and the admin
 * lists as well, because eighty-seven articles in one column is a page nobody
 * reaches the bottom of.
 */

/** Page numbers to show around the current one, with gaps marked null. */
function pageWindow(current: number, total: number): (number | null)[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const pages = new Set([1, total, current]);
  for (const offset of [-2, -1, 1, 2]) {
    const page = current + offset;
    if (page > 1 && page < total) pages.add(page);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const withGaps: (number | null)[] = [];
  let previous = 0;
  for (const page of sorted) {
    if (page - previous > 1) withGaps.push(null);
    withGaps.push(page);
    previous = page;
  }
  return withGaps;
}

export default function Pagination({
  page,
  pageCount,
  totalResults,
  shown,
  perPage,
  noun = "results",
  label,
  hrefForPage,
}: {
  page: number;
  pageCount: number;
  totalResults: number;
  /** How many results are on this page, for the count line. */
  shown: number;
  /** Needed to work out which result this page starts at. */
  perPage: number;
  /** What is being counted, plural: "parts", "articles", "vehicles". */
  noun?: string;
  /** Names the nav for a screen reader, e.g. "Article pages". */
  label?: string;
  hrefForPage: (page: number) => string;
}) {
  if (totalResults === 0) return null;

  const first = (page - 1) * perPage + 1;

  return (
    <nav
      aria-label={label ?? `${noun} pages`}
      className="mt-10 flex flex-col items-center gap-4"
    >
      <p className="text-sm text-gray-400">
        Showing {first.toLocaleString()} to{" "}
        {(first + shown - 1).toLocaleString()} of{" "}
        {totalResults.toLocaleString()} {noun}
      </p>

      {pageCount > 1 && (
        <ul className="flex flex-wrap items-center justify-center gap-2">
          <li>
            <Step
              href={hrefForPage(page - 1)}
              disabled={page === 1}
              label="Previous page"
            >
              Prev
            </Step>
          </li>

          {pageWindow(page, pageCount).map((entry, index) =>
            entry === null ? (
              <li
                key={`gap-${index}`}
                aria-hidden="true"
                className="px-1 text-gray-600"
              >
                ...
              </li>
            ) : (
              <li key={entry}>
                <Link
                  href={hrefForPage(entry)}
                  aria-label={`Page ${entry}`}
                  aria-current={entry === page ? "page" : undefined}
                  className={
                    entry === page
                      ? "bg-brand block min-w-10 rounded-lg px-3 py-2 text-center text-sm font-semibold text-white"
                      : "block min-w-10 rounded-xl border-line border px-3 py-2 text-center text-sm font-semibold text-gray-300 transition-colors hover:border-white/25 hover:text-white"
                  }
                >
                  {entry}
                </Link>
              </li>
            ),
          )}

          <li>
            <Step
              href={hrefForPage(page + 1)}
              disabled={page === pageCount}
              label="Next page"
            >
              Next
            </Step>
          </li>
        </ul>
      )}
    </nav>
  );
}

function Step({
  href,
  disabled,
  label,
  children,
}: {
  href: string;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  const className =
    "block rounded-lg border px-4 py-2 text-sm font-semibold transition-colors";

  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className={`${className} cursor-not-allowed border-line text-gray-600`}
      >
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label={label}
      className={`${className} border-line text-gray-300 hover:border-white/25 hover:text-white`}
    >
      {children}
    </Link>
  );
}

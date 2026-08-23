import Link from "next/link";

/**
 * Paging through results.
 *
 * Real links, not buttons: each page has its own URL, so it can be shared,
 * crawled, opened in a new tab and reached with the back button. The old page
 * kept the page number in component state, which meant page seven of a filtered
 * catalogue could not be linked to at all.
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

export default function PartsPagination({
  page,
  pageCount,
  totalResults,
  shown,
  hrefForPage,
}: {
  page: number;
  pageCount: number;
  totalResults: number;
  /** How many results are on this page, for the count line. */
  shown: number;
  hrefForPage: (page: number) => string;
}) {
  if (totalResults === 0) return null;

  const first = (page - 1) * 20 + 1;

  return (
    <nav
      aria-label="Parts pages"
      className="mt-10 flex flex-col items-center gap-4"
    >
      <p className="text-sm text-gray-400">
        Showing {first.toLocaleString()} to{" "}
        {(first + shown - 1).toLocaleString()} of{" "}
        {totalResults.toLocaleString()} parts
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
                      : "block min-w-10 rounded-lg border border-gray-700 px-3 py-2 text-center text-sm font-semibold text-gray-300 transition-colors hover:border-gray-500 hover:text-white"
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
        className={`${className} cursor-not-allowed border-gray-800 text-gray-600`}
      >
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label={label}
      className={`${className} border-gray-700 text-gray-300 hover:border-gray-500 hover:text-white`}
    >
      {children}
    </Link>
  );
}

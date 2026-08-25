import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import FaqSection from "@/components/FaqSection";
import PartCard from "@/components/parts/PartCard";
import PartsFilters from "@/components/parts/PartsFilters";
import PartsPagination from "@/components/parts/PartsPagination";
import PartsSearch from "@/components/parts/PartsSearch";
import Container from "@/components/layout/Container";
import { getCatalogPage } from "@/lib/parts/repository";
import { partKey } from "@/lib/parts/identity";
import { productsListSchema } from "@/lib/schema/products";
import { breadcrumbSchema } from "@/lib/schema/breadcrumbs";
import { HOMEPAGE_FAQS } from "@/lib/faqs";
import type { PartFilters } from "@/lib/parts/types";

export const metadata: Metadata = {
  title:
    "Used Car Parts for Sale NSW | Browse Our Stock | Central Coast Auto Parts",
  description:
    "Browse used car parts at Central Coast Auto Parts in Berkeley Vale NSW. Engines, gearboxes, body panels, electrical and more, all tested, warranted, ship Australia-wide.",
  alternates: { canonical: "/products" },
};

type SearchParams = Record<string, string | string[] | undefined>;

function one(params: SearchParams, key: string): string {
  const value = params[key];
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

/** The filters as the URL states them. */
function readFilters(params: SearchParams): PartFilters {
  return {
    year: one(params, "year"),
    make: one(params, "make"),
    model: one(params, "model"),
    partType: one(params, "part_type"),
  };
}

/** Keep the filters and search on a link, change only the page. */
function buildHref(params: SearchParams, page: number): string {
  const search = new URLSearchParams();
  for (const key of ["year", "make", "model", "part_type", "q"]) {
    const value = one(params, key);
    if (value) search.set(key, value);
  }
  if (page > 1) search.set("page", String(page));
  const query = search.toString();
  return query ? `/products?${query}` : "/products";
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const filters = readFilters(params);
  const query = one(params, "q");

  /*
    The whole catalogue is in memory on the server, so filtering, counting and
    paging all happen before anything is sent. That is what lets this page be
    server rendered: the old one fetched its parts from the browser, so a
    crawler, and anyone whose scripts had not loaded, saw a spinner.
  */
  const { page, options, available, syncedAt } = await getCatalogPage({
    filters,
    query,
    page: Number(one(params, "page")) || 1,
  });

  return (
    <div className="bg-admin min-h-screen text-white">
      <JsonLd data={productsListSchema} />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Used Auto Parts", path: "/products" },
        ])}
      />

      <div className="border-line bg-card/80 border-b backdrop-blur-sm">
        <Container className="flex flex-col gap-4 py-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white md:text-3xl">
              Explore Our <span className="text-brand-text">Parts</span>
            </h1>
            <p className="mt-1 text-sm text-gray-400">
              Filter by year, make, model and part type
              {syncedAt
                ? `. Stock as at ${new Date(syncedAt).toLocaleDateString(
                    "en-AU",
                    {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    },
                  )}.`
                : "."}
            </p>
          </div>

          <PartsSearch
            query={query}
            filters={filters}
            resultCount={available ? page.totalResults : null}
          />
        </Container>
      </div>

      <Container className="flex flex-col gap-8 py-8 md:flex-row">
        <aside className="border-line bg-card w-full flex-shrink-0 rounded-2xl border p-6 md:max-w-[260px]">
          <div className="md:sticky md:top-24">
            <PartsFilters filters={filters} options={options} query={query} />
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          {!available ? (
            <Empty
              heading="The parts catalogue is not loaded"
              body="Run the catalogue sync, then reload this page."
            />
          ) : page.totalResults === 0 ? (
            <Empty
              heading="No parts match that combination"
              body="Try a wider search: fewer filters, or the same make without the year."
            />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {page.parts.map((part) => (
                  <PartCard key={partKey(part) ?? part.stockNo} part={part} />
                ))}
              </div>

              <PartsPagination
                page={page.page}
                pageCount={page.pageCount}
                totalResults={page.totalResults}
                shown={page.parts.length}
                hrefForPage={(target) => buildHref(params, target)}
              />
            </>
          )}
        </main>
      </Container>

      <FaqSection faqs={HOMEPAGE_FAQS} />
    </div>
  );
}

function Empty({ heading, body }: { heading: string; body: string }) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center px-4 text-center">
      <p className="text-lg font-semibold text-white">{heading}</p>
      <p className="mt-2 max-w-md text-sm text-gray-400">{body}</p>
    </div>
  );
}

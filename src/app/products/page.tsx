import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import FaqSection from "@/components/FaqSection";
import PartCard from "@/components/parts/PartCard";
import PartsFilters from "@/components/parts/PartsFilters";
import Pagination from "@/components/layout/Pagination";
import PartsSearch from "@/components/parts/PartsSearch";
import Container from "@/components/layout/Container";
import { getCatalogPage } from "@/lib/parts/repository";
import { partKey } from "@/lib/parts/identity";
import { productsListSchema } from "@/lib/schema/products";
import { breadcrumbSchema } from "@/lib/schema/breadcrumbs";
import { HOMEPAGE_FAQS } from "@/lib/faqs";
import type { PartFilters } from "@/lib/parts/types";

const BASE_METADATA: Metadata = {
  title:
    "Used Car Parts for Sale NSW | Central Coast Auto Parts",
  description:
    "Browse used car parts from Central Coast Auto Parts, Berkeley Vale NSW. Engines, gearboxes, panels and electrical, all tested and warranted.",
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

/**
 * The catalogue's own address is indexable. Its filtered and paginated views
 * are not.
 *
 * Two separate problems were being solved with one wrong answer. Every
 * parameterised view declared `/products` as its canonical, which tells Google
 * that page 47 of the gearboxes is a duplicate of page one. It is not: it holds
 * twenty different parts. That instruction is why none of them would ever be
 * indexed.
 *
 * But there are 1,635 pages of pagination and a filter combination for every
 * make, model, year and part type, and putting that in the index is the
 * textbook faceted-navigation problem: thousands of near-identical pages
 * competing with each other and burning the crawl budget that should be going
 * to products.
 *
 * So each view now canonicalises to itself, which is the truth, and carries
 * `noindex, follow`, which is the instruction. Follow matters: Googlebot still
 * walks these pages to reach all 32,000 product pages, and those are the ones
 * in the sitemap and the ones that rank.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const params = await searchParams;

  const query = new URLSearchParams();
  // A fixed order, so one set of filters always produces one canonical rather
  // than one per order the parameters happen to arrive in.
  for (const key of ["year", "make", "model", "part_type", "q", "page"]) {
    const value = one(params, key);
    if (value && !(key === "page" && value === "1")) query.set(key, value);
  }

  const search = query.toString();
  if (!search) return BASE_METADATA;

  return {
    ...BASE_METADATA,
    alternates: { canonical: `/products?${search}` },
    robots: { index: false, follow: true },
  };
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

              <Pagination
                perPage={20}
                noun="parts"
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

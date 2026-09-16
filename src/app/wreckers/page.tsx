import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/layout/Container";
import JsonLd from "@/components/JsonLd";
import CategoryHero from "@/components/parts/CategoryHero";
import { MAKE_PAGES } from "@/lib/content/make-pages";
import { makeStock } from "@/lib/parts/make-stock";
import { breadcrumbSchema } from "@/lib/schema/breadcrumbs";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Car Wreckers by Make NSW | Central Coast Auto Parts",
  description:
    "Wrecking Hyundai, Kia, Toyota, Subaru, Mazda, Nissan, Ford, Holden and more at Berkeley Vale NSW. Used parts by make, inspected, warranted and shipped Australia-wide.",
  alternates: { canonical: "/wreckers" },
};

/**
 * The make hub.
 *
 * Its first job is to be a crawlable index so the ten make pages are never
 * orphaned. Its second is to be the page that ranks for "car wreckers" itself,
 * with the specific makes fanning out from it. Live stock counts sit on each
 * card so the page shows depth rather than claiming it.
 */
export default async function WreckersHubPage() {
  const counts = await Promise.all(
    MAKE_PAGES.map(async (page) => ({
      page,
      count: (await makeStock(page.make)).count,
    })),
  );

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Wreckers by Make", path: "/wreckers" },
        ])}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Car wreckers by make",
          numberOfItems: MAKE_PAGES.length,
          itemListElement: MAKE_PAGES.map((page, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: page.label,
            url: `${site.url}/wreckers/${page.slug}`,
          })),
        }}
      />

      <CategoryHero
        tagline="CAR WRECKERS, BERKELEY VALE NSW"
        heading="Car Wreckers by Make"
        intro="We dismantle the cars Australians actually drive, and hold their parts by the thousand. Pick your make to see what is on the shelf, inspected, warranted and ready to ship Australia-wide from Berkeley Vale."
      />

      <section className="bg-admin py-14 text-white md:py-20">
        <Container>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {counts.map(({ page, count }) => (
              <Link
                key={page.slug}
                href={`/wreckers/${page.slug}`}
                className="border-line bg-card hover:border-brand group rounded-2xl border p-6 transition-colors"
              >
                <h2 className="group-hover:text-brand-text mb-1 text-lg font-bold transition-colors">
                  {page.label} Wreckers
                </h2>
                {count > 0 && (
                  <p className="text-brand-text text-sm font-semibold tabular-nums">
                    {count.toLocaleString("en-AU")} parts in stock
                  </p>
                )}
                <p className="mt-3 text-sm leading-relaxed text-gray-400">
                  {page.popularModels.slice(0, 4).join(", ")}
                  {page.popularModels.length > 4 ? " and more" : ""}
                </p>
              </Link>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import CategoryHero from "@/components/parts/CategoryHero";
import { PART_CATEGORIES } from "@/lib/content/part-categories";
import { breadcrumbSchema } from "@/lib/schema/breadcrumbs";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Used Car Parts by Category NSW | Central Coast Auto Parts",
  description:
    "Browse used car parts by category at Central Coast Auto Parts Berkeley Vale NSW. Engines, gearboxes, body panels, electrical, suspension and more, all warranted.",
  alternates: { canonical: "/parts" },
};

export default function PartsHubPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Parts by Category", path: "/parts" },
        ])}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Used car parts by category",
          numberOfItems: PART_CATEGORIES.length,
          itemListElement: PART_CATEGORIES.map((category, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: category.label,
            url: `${site.url}/parts/${category.slug}`,
          })),
        }}
      />

      <CategoryHero
        tagline="USED AUTO PARTS, BERKELEY VALE NSW"
        heading="Used Car Parts by Category"
        intro="Central Coast Auto Parts stocks second-hand car parts across all major categories, all inspected, warranted and available for nationwide delivery from Berkeley Vale NSW."
      />

      <section className="bg-admin px-6 py-16 text-white md:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 text-center md:mb-14">
            <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">
              Browse by Category
            </h2>
            <div className="bg-brand mx-auto mt-4 h-[3px] w-14 rounded-full" />
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {PART_CATEGORIES.map((category) => (
              <Link
                key={category.slug}
                href={`/parts/${category.slug}`}
                className="group bg-card hover:border-brand/60 flex flex-col gap-4 rounded-3xl border border-white/10 p-7 shadow-[0_16px_45px_rgba(0,0,0,0.55)] transition-all hover:shadow-[0_16px_45px_rgba(233,22,47,0.15)]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-2xl">
                  <span aria-hidden="true">{category.icon}</span>
                </div>
                <div>
                  <h3 className="group-hover:text-brand-text mb-1 text-base font-bold transition-colors md:text-lg">
                    {category.label}
                  </h3>
                  <p className="text-xs tracking-wider text-white/50 uppercase">
                    View {category.label.toLowerCase()}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

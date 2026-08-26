import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/layout/Container";
import SectionHeading from "@/components/layout/SectionHeading";
import JsonLd from "@/components/JsonLd";
import FaqSection from "@/components/FaqSection";
import CategoryHero from "@/components/parts/CategoryHero";
import { PART_CATEGORIES } from "@/lib/content/part-categories";
import { BUYING_STEPS, PARTS_FAQS } from "@/lib/content/parts-hub";
import { faqSchema } from "@/lib/faqs";
import { breadcrumbSchema } from "@/lib/schema/breadcrumbs";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Used Car Parts by Category NSW | Central Coast Auto Parts",
  description:
    "Used car parts by category in Berkeley Vale NSW. Engines, gearboxes, body panels, electrical, suspension and more, all inspected and warranted.",
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

      <JsonLd data={faqSchema(PARTS_FAQS)} />

      <CategoryHero
        tagline="USED AUTO PARTS, BERKELEY VALE NSW"
        heading="Used Car Parts by Category"
        intro="Central Coast Auto Parts stocks second-hand car parts across all major categories, all inspected, warranted and available for nationwide delivery from Berkeley Vale NSW."
      />

      <section className="bg-admin py-14 text-white md:py-20">
        <Container>
          <SectionHeading
            className="mb-10 md:mb-12"
            title="Browse by Category"
            intro="Eight categories covering what comes off the cars in the yard. Every part is inspected, and the major components carry a warranty."
          />

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {PART_CATEGORIES.map((category) => (
              <Link
                key={category.slug}
                href={`/parts/${category.slug}`}
                className="group border-line bg-card hover:border-brand/60 flex flex-col gap-4 rounded-2xl border p-6 transition-colors"
              >
                <div className="border-line flex h-12 w-12 items-center justify-center rounded-xl border bg-white/5 text-2xl">
                  <span aria-hidden="true">{category.icon}</span>
                </div>
                <div>
                  <h3 className="group-hover:text-brand-text mb-1 text-base font-bold transition-colors md:text-lg">
                    {category.label}
                  </h3>
                  <p className="text-xs tracking-wider text-gray-500 uppercase">
                    View {category.label.toLowerCase()}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-admin pb-14 text-white md:pb-20">
        <Container>
          <SectionHeading
            className="mb-10 md:mb-12"
            eyebrow="Buying a used part"
            title="How it works"
            intro="Four things worth knowing before you order, whether it is your own car or a workshop job."
          />

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {BUYING_STEPS.map((step) => (
              <div
                key={step.title}
                className="border-line bg-card rounded-2xl border p-6"
              >
                <h3 className="mb-2 text-base font-bold text-white">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-gray-400">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <FaqSection
        faqs={PARTS_FAQS}
        intro="What people ask before buying a second-hand part"
      />
    </>
  );
}

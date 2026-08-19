import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import FaqSection from "@/components/FaqSection";
import ContactFormSection from "@/components/ContactFormSection";
import {
  WhatWeSupply,
  WhyChooseUs,
  WhyUsedParts,
} from "@/components/sections/MarketingSections";
import { HOMEPAGE_FAQS, faqSchema } from "@/lib/faqs";
import { homeBusinessSchema } from "@/lib/schema/business";

/**
 * Home page.
 *
 * Everything except the FAQ accordion is a server component, so the whole page
 * — headings, copy, category links, structured data — is in the initial HTML.
 * The current site renders all of this in the browser from an empty div, so
 * this is the single largest SEO improvement in the migration.
 *
 * The hero and section headings set their own font stack rather than inheriting
 * the site's Arial. That is what the live site does; it is reproduced here
 * rather than unified, per the brief to match exactly.
 */

/** The system stack the current site applies to these sections inline. */
const HERO_FONT =
  "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

export default function HomePage() {
  return (
    <div>
      <JsonLd data={homeBusinessSchema()} />
      <JsonLd data={faqSchema(HOMEPAGE_FAQS)} />

      <section
        className="relative flex items-center overflow-hidden py-20 md:min-h-[min(78vh,820px)] md:py-28"
        style={{
          fontFamily: HERO_FONT,
          backgroundColor: "#050505",
          backgroundImage: `
            radial-gradient(ellipse 120% 80% at 0% 50%, rgba(233, 22, 47, 0.45), transparent 55%),
            radial-gradient(ellipse 70% 50% at 100% 0%, rgba(233, 22, 47, 0.12), transparent 45%),
            linear-gradient(100deg, #2a0c10 0%, #12080a 28%, #080808 55%, #050505 100%)
          `,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="relative z-[1] mx-auto w-full max-w-4xl px-6 text-center">
          <p className="text-brand mb-5 text-[11px] font-semibold tracking-[0.28em] uppercase sm:text-xs sm:tracking-[0.35em] md:text-sm">
            CENTRAL COAST AUTO PARTS — BERKELEY VALE NSW
          </p>
          <h1 className="mb-6 text-3xl leading-[1.15] font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl lg:text-[3.25rem]">
            Used Car Parts Central Coast NSW — Engines, Gearboxes, Panels & More
          </h1>
          <p className="mx-auto mb-10 max-w-3xl text-sm leading-relaxed text-white/90 md:text-base lg:text-lg">
            Central Coast Auto Parts is a trusted used auto parts supplier and
            car wrecker based in Berkeley Vale, NSW. We stock quality second-hand
            engines, gearboxes, body panels, electrical components and mechanical
            parts for everyday cars, 4x4s, vans and light commercials — all
            tested, warranted and ready to ship Australia-wide.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-5">
            <Link
              href="/products"
              className="bg-brand hover:bg-brand-alt inline-flex min-w-[220px] items-center justify-center rounded-full px-8 py-3.5 text-xs font-bold tracking-[0.12em] text-white uppercase shadow-[0_0_28px_rgba(233,22,47,0.45)] transition-colors hover:shadow-[0_0_36px_rgba(233,22,47,0.55)] sm:text-sm"
            >
              Browse used parts
            </Link>
            <Link
              href="/contact"
              className="inline-flex min-w-[220px] items-center justify-center rounded-full border border-white/90 bg-transparent px-8 py-3.5 text-xs font-bold tracking-[0.12em] text-white uppercase transition-colors hover:bg-white/10 sm:text-sm"
            >
              Contact us
            </Link>
          </div>
        </div>
      </section>

      <WhatWeSupply />
      <WhyUsedParts />
      <WhyChooseUs
        closing={
          <>
            Whether you need a used engine, a replacement panel or have a
            question —{" "}
            <span className="text-brand font-semibold">
              Central Coast Auto Parts has you covered.
            </span>
          </>
        }
      />

      <FaqSection faqs={HOMEPAGE_FAQS} />
      <ContactFormSection />
    </div>
  );
}

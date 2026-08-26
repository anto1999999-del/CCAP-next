import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import FaqSection from "@/components/FaqSection";
import Container from "@/components/layout/Container";
import PageHero from "@/components/layout/PageHero";
import SectionHeading from "@/components/layout/SectionHeading";
import SellYourCarForm from "@/components/SellYourCarForm";
import { SELL_FAQS, SELL_STEPS, WE_BUY } from "@/lib/content/sell-your-car";
import { faqSchema } from "@/lib/faqs";
import { breadcrumbSchema } from "@/lib/schema/breadcrumbs";
import { sellYourCarServiceSchema } from "@/lib/schema/sell-your-car";

export const metadata: Metadata = {
  title: "Sell Your Car for Cash NSW | Central Coast Auto Parts",
  description:
    "Sell your car for cash on the Central Coast NSW. We buy damaged, unwanted and non-running cars and vans. Fast assessment and a free quote.",
  alternates: { canonical: "/sellyourcar" },
};

export default function SellYourCarPage() {
  return (
    <>
      <JsonLd data={sellYourCarServiceSchema()} />
      {/*
        The questions on the page, marked up so they can be quoted directly in
        a search result or by an answer engine rather than only being readable
        once somebody has opened the page.
      */}
      <JsonLd data={faqSchema(SELL_FAQS)} />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Sell Your Car", path: "/sellyourcar" },
        ])}
      />

      {/*
        The hero carries the message. It used to say "SELL A CAR" and then the
        section below it said "SELL YOUR CAR" again, one on top of the other.
      */}
      <PageHero
        eyebrow="Berkeley Vale NSW"
        title="SELL YOUR CAR"
        subtitle="Ready to sell your car hassle-free? Turn to our trusted team in Berkeley Vale. We buy cars in any condition, running or not, and pay on the spot."
        image="/images/HEROSell.webp"
        actions={[
          { href: "#sell-form", label: "GET A PRICE" },
          { href: "/products", label: "BROWSE PARTS" },
        ]}
      />

      {/*
        One form on this page, which is the point of the page. The site-wide
        contact block used to sit directly beneath it, so somebody who had come
        to sell a car was shown two forms stacked one on the other and had to
        work out which one was for them.
      */}
      <div id="sell-form" className="bg-admin py-14 text-white md:py-20">
        <Container>
          <div className="mx-auto max-w-3xl">
            <SectionHeading
              className="mb-10"
              title="Tell us about your car"
              intro="The more you can tell us, the closer our first number will be. We come back to you the same day wherever we can."
            />

            <SellYourCarForm />
          </div>
        </Container>
      </div>

      <section className="bg-admin pb-14 text-white md:pb-20">
        <Container>
          <SectionHeading
            className="mb-10 md:mb-12"
            eyebrow="How it works"
            title="From the form to being paid"
            intro="Four steps, and none of them need the car to be running."
          />

          <ol className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {SELL_STEPS.map((step) => (
              <li
                key={step.step}
                className="border-line bg-card rounded-2xl border p-6"
              >
                <span
                  aria-hidden="true"
                  className="text-brand-text mb-3 block text-2xl font-extrabold tabular-nums"
                >
                  {step.step}
                </span>
                <h3 className="mb-2 text-base font-bold text-white">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-gray-400">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section className="bg-admin pb-14 text-white md:pb-20">
        <Container>
          <SectionHeading
            className="mb-10 md:mb-12"
            eyebrow="What we buy"
            title="The car does not have to be worth fixing"
            intro="If it has parts other people still need, it is worth something to us."
          />

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {WE_BUY.map((item) => (
              <div
                key={item.title}
                className="border-line bg-card rounded-2xl border p-6"
              >
                <h3 className="mb-2 text-base font-bold text-white">
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed text-gray-400">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <FaqSection
        faqs={SELL_FAQS}
        intro="What people ask before they fill in the form"
      />
    </>
  );
}

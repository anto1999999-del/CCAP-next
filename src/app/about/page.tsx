import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import Container from "@/components/layout/Container";
import PageHero from "@/components/layout/PageHero";
import ContactFormSection from "@/components/ContactFormSection";
import {
  WhatWeSupply,
  WhyChooseUs,
  WhyUsedParts,
} from "@/components/sections/MarketingSections";
import { ABOUT_SUPPLY_CARDS, SERVICE_AREAS } from "@/lib/content/sections";
import { breadcrumbSchema } from "@/lib/schema/breadcrumbs";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title:
    "About Us | Car Wreckers Berkeley Vale NSW | Central Coast Auto Parts",
  description:
    "Central Coast Auto Parts is a trusted car wrecker and used parts supplier in Berkeley Vale NSW. Engines, gearboxes, body panels and more, all tested and sold with warranty.",
  alternates: { canonical: "/about" },
};

/** Category links used in the opening paragraph. */
const PART_LINKS = [
  { href: "/parts/engines", label: "engines" },
  { href: "/parts/gearboxes", label: "gearboxes" },
  { href: "/parts/body-panels", label: "body panels" },
  { href: "/parts/electrical", label: "electrical components" },
  { href: "/parts/suspension", label: "suspension" },
] as const;

export default function AboutPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "About Us", path: "/about" },
        ])}
      />

      <PageHero
        title="ABOUT US"
        image="/images/AboutUs.webp"
        actions={[
          { href: "/products", label: "VIEW PARTS" },
          { href: "/contact", label: "CONTACT US" },
        ]}
      />

      <div className="bg-surface py-16 md:py-20">
        <Container>
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="order-2 lg:order-1">
              <div className="relative overflow-hidden rounded-xl shadow-2xl transition-transform duration-300 hover:scale-[1.02]">
                <Image
                  src="/images/about us image.png"
                  alt="The Central Coast Auto Parts yard at Berkeley Vale"
                  width={1200}
                  height={800}
                  className="h-auto w-full rounded-xl"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <h2 className="mb-6 text-3xl leading-tight font-bold text-white md:text-4xl lg:text-2xl">
                Central Coast&apos;s Trusted Car Wreckers &amp; Used Auto Parts
                Supplier, Berkeley Vale NSW
              </h2>

              <div className="space-y-5 text-base leading-relaxed text-gray-300 md:text-lg">
                <p>
                  Central Coast Auto Parts is a licensed auto dismantler and used
                  car parts supplier based in{" "}
                  <span className="font-semibold text-white">
                    Berkeley Vale, NSW
                  </span>
                  . We supply quality second-hand{" "}
                  {PART_LINKS.map((link, index) => (
                    <span key={link.href}>
                      <Link
                        href={link.href}
                        className="text-brand-text hover:underline"
                      >
                        {link.label}
                      </Link>
                      {index < PART_LINKS.length - 1 ? ", " : ""}
                    </span>
                  ))}{" "}
                  and more, for cars, 4WDs, vans and light commercials across
                  all major Japanese, Korean, European and Australian makes and
                  models.
                </p>
                <p>
                  Every part is carefully inspected before sale and all major
                  components are sold with a{" "}
                  <span className="text-brand-text font-bold">warranty</span> for your
                  peace of mind. We are a fully licensed operation (Licence No.{" "}
                  {site.contact.licence}) committed to quality and honest service
                  on every job.
                </p>
                <p>
                  We supply smash repairers, mechanics, insurance companies and
                  everyday customers across the Central Coast (Gosford, Wyong,
                  Tuggerah and beyond) as well as Newcastle, Sydney and
                  Australia-wide with fast freight and same-day dispatch where
                  possible. Can&apos;t find what you need? Call us on{" "}
                  <a
                    href={`tel:${site.contact.phoneE164}`}
                    className="text-brand-text font-semibold hover:underline"
                  >
                    {site.contact.phone}
                  </a>{" "}
                  and we&apos;ll check our full stock for you.
                </p>
              </div>

              <Link
                href="/contact"
                className="bg-brand hover:bg-brand-hover mt-8 inline-block rounded-lg px-8 py-3 font-semibold tracking-wide text-white uppercase shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </Container>
      </div>

      {/* About lists the same categories as Home but without linking them. */}
      <WhatWeSupply cards={ABOUT_SUPPLY_CARDS} linked={false} />

      <section className="border-t border-white/5 bg-[#0a0a0a] py-16 text-white md:py-20">
        <Container>
          <div className="mb-10 text-center">
            <p className="text-brand-text mb-3 text-[11px] font-semibold tracking-[0.28em] uppercase sm:text-xs">
              LOCAL &amp; NATIONWIDE
            </p>
            <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">
              Areas We Serve
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-white/60 md:text-base">
              Based in Berkeley Vale, we supply used car parts locally and ship
              Australia-wide every business day.
            </p>
            <div className="bg-brand mx-auto mt-4 h-[3px] w-14 rounded-full" />
          </div>

          <div className="mx-auto grid max-w-5xl grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {SERVICE_AREAS.map((location) => (
              <div
                key={location.area}
                className="bg-card rounded-2xl border border-white/10 px-4 py-4 text-center"
              >
                <p className="text-sm font-bold text-white">{location.area}</p>
                <p className="mt-0.5 text-xs text-white/40">{location.note}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <WhyUsedParts />
      <WhyChooseUs
        closing={
          <>
            Whether you need a used engine, a replacement panel or want to sell
            your car fast,{" "}
            <span className="text-brand-text font-semibold">
              Central Coast Auto Parts has you covered.
            </span>
          </>
        }
      />

      <ContactFormSection />
    </>
  );
}

import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import ContactFormSection from "@/components/ContactFormSection";
import PageHero from "@/components/layout/PageHero";
import SellYourCarForm from "@/components/SellYourCarForm";
import { breadcrumbSchema } from "@/lib/schema/breadcrumbs";
import { sellYourCarServiceSchema } from "@/lib/schema/sell-your-car";

export const metadata: Metadata = {
  title: "Sell Your Car for Cash | Central Coast Auto Parts Berkeley Vale NSW",
  description:
    "Sell your car for cash on the Central Coast NSW. We buy damaged, unwanted and non-running cars, vans and light vehicles. Fast assessment, fair prices, free quote.",
  alternates: { canonical: "/sellyourcar" },
};

export default function SellYourCarPage() {
  return (
    <>
      <JsonLd data={sellYourCarServiceSchema()} />
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
      />

      <div className="bg-surface text-white">
        <div className="mx-auto max-w-5xl px-4 py-12 md:px-8 md:py-16 lg:px-16">
          <div className="mb-10 text-center">
            <h2 className="mb-3 text-3xl font-extrabold tracking-tight md:text-4xl">
              Tell us about your car
            </h2>
            <p className="mx-auto max-w-2xl text-base text-gray-400">
              The more you can tell us, the closer our first number will be. We
              come back to you the same day wherever we can.
            </p>
            <div className="bg-brand mx-auto mt-4 h-[3px] w-14 rounded-full" />
          </div>

          <SellYourCarForm />
        </div>
      </div>

      <ContactFormSection />
    </>
  );
}

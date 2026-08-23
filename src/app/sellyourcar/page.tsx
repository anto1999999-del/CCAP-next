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

      <PageHero title="SELL A CAR" image="/images/HEROSell.webp" />

      <div className="bg-surface text-white">
        <div className="mx-auto max-w-5xl px-4 py-12 md:px-8 md:py-16 lg:px-16">
          <div className="mb-10 text-center">
            <h2 className="text-brand mb-3 text-4xl font-bold md:text-5xl">
              SELL YOUR CAR
            </h2>
            <p className="mx-auto mb-2 max-w-2xl text-lg text-gray-300 md:text-xl">
              Ready to sell your car hassle-free? Turn to our trusted team in
              Berkeley Vale.
            </p>
            <p className="text-sm text-gray-400">
              Serving customers in Sydney and Berkeley regions with top-notch
              service.
            </p>
          </div>

          <SellYourCarForm />
        </div>
      </div>

      <ContactFormSection />
    </>
  );
}

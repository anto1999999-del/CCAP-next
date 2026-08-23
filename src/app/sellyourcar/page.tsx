import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import ContactFormSection from "@/components/ContactFormSection";
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
        Hero band. Reproduces the old `.sellyourcar` rules — 455px tall,
        dropping to 360px under 800px and 330px under 520px — without the
        stylesheet, which defined eighteen classes of which only five were used
        and relied on CSS nesting that the build did not reliably support.
      */}
      <div
        className="flex h-[330px] items-center justify-center bg-black bg-cover bg-center px-3 text-center min-[520px]:h-[360px] min-[800px]:h-[455px] min-[800px]:justify-start min-[800px]:bg-top min-[800px]:px-0 min-[800px]:text-left"
        style={{ backgroundImage: "url(/images/HEROSell.webp)" }}
      >
        {/*
          The live page has no h1 at all — its largest heading is an h3 inside
          the shared hero, and the section below it is an h2. This is the h1 the
          page has always needed; the wording and size are unchanged.
        */}
        <h1 className="w-full text-[40px] leading-[1.05] font-bold tracking-[0.02em] text-white min-[800px]:mx-[100px] min-[800px]:w-auto">
          SELL A CAR
        </h1>
      </div>

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

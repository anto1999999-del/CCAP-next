import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import Container from "@/components/layout/Container";
import PageHero from "@/components/layout/PageHero";
import SectionHeading from "@/components/layout/SectionHeading";
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

      {/*
        One form on this page, which is the point of the page. The site-wide
        contact block used to sit directly beneath it, so somebody who had come
        to sell a car was shown two forms stacked one on the other and had to
        work out which one was for them.
      */}
      <div className="bg-admin py-14 text-white md:py-20">
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
    </>
  );
}

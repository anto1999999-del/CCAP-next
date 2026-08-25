import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import Container from "@/components/layout/Container";
import PageHero from "@/components/layout/PageHero";
import ContactFormSection from "@/components/ContactFormSection";
import GalleryGrid from "@/components/gallery/GalleryGrid";
import { listMakes, listVehicles } from "@/lib/blog/gallery";
import { breadcrumbSchema } from "@/lib/schema/breadcrumbs";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Vehicle Gallery | Central Coast Auto Parts Berkeley Vale NSW",
  description:
    "A look at cars we have dismantled at our Berkeley Vale yard. Filter by make, then call us to check the part you need. We hold far more stock than we photograph.",
  alternates: { canonical: "/gallery" },
};

export default async function GalleryPage() {
  const [vehicles, makes] = await Promise.all([listVehicles(), listMakes()]);

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Gallery", path: "/gallery" },
        ])}
      />
      {/*
        Listed as an ItemList so the yard's stock is legible to search engines
        as a collection rather than as a page of unrelated images.
      */}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Vehicle gallery at Central Coast Auto Parts",
          numberOfItems: vehicles.length,
          itemListElement: vehicles.map((vehicle, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: vehicle.title,
            image: vehicle.image?.url,
          })),
        }}
      />

      {/*
        Gradient rather than a photograph. The available hero image has
        "EXPLORE OUR SALVAGE VEHICLES" burnt into it, so any heading placed on
        it competes with words already in the picture.
      */}
      <PageHero
        eyebrow="Vehicle gallery"
        title="GALLERY"
        subtitle={`A showcase of cars we have dismantled at Berkeley Vale. We hold far more stock than we photograph, so call us on ${site.contact.phone} and we will check the part you need.`}
        actions={[
          { href: "/products", label: "BROWSE PARTS" },
          { href: "/contact", label: "ASK ABOUT A PART" },
        ]}
      />

      <div className="bg-admin py-14 text-white md:py-20">
        <Container>
          <GalleryGrid vehicles={vehicles} makes={makes} />
        </Container>
      </div>

      <ContactFormSection />
    </>
  );
}

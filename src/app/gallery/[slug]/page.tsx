import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import JsonLd from "@/components/JsonLd";
import Container from "@/components/layout/Container";
import PageHero from "@/components/layout/PageHero";
import ContactFormSection from "@/components/ContactFormSection";
import VehiclePhotos from "@/components/gallery/VehiclePhotos";
import VehicleCard from "@/components/gallery/VehicleCard";
import {
  getRelatedVehicles,
  getVehicle,
  listVehicleSlugs,
} from "@/lib/blog/gallery";
import { breadcrumbSchema } from "@/lib/schema/breadcrumbs";
import { absoluteUrl, site } from "@/lib/site";

/** Every vehicle is known at build time, so every page is static. */
export async function generateStaticParams() {
  return (await listVehicleSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const vehicle = await getVehicle(slug);
  if (!vehicle) return {};

  /*
    Written here rather than carried from Yoast. The 26 vehicle descriptions
    were auto-generated on WordPress: four repeat themselves mid-sentence, some
    run to 465 characters, and two titles contain the vehicle name twice. The
    87 articles have hand-written meta and keep theirs untouched.
  */
  const title = `${vehicle.title} | Used Parts | ${site.name}`;
  const description = `Used parts from a ${vehicle.title} dismantled at our Berkeley Vale yard. Call ${site.contact.phone} and we will check the part you need.`;

  return {
    title,
    description,
    alternates: { canonical: `/gallery/${vehicle.slug}` },
    openGraph: {
      title,
      description,
      type: "article",
      url: `${site.url}/gallery/${vehicle.slug}`,
      images: vehicle.photos[0] ? [{ url: vehicle.photos[0].url }] : undefined,
    },
  };
}

export default async function VehiclePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const vehicle = await getVehicle(slug);
  if (!vehicle) notFound();

  const related = await getRelatedVehicles(slug);

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Gallery", path: "/gallery" },
          { name: vehicle.title, path: `/gallery/${vehicle.slug}` },
        ])}
      />
      {/*
        Described as a Vehicle rather than an Article. It is a car in the yard,
        not something written, and the make and model are the parts of it worth
        making machine readable.
      */}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Vehicle",
          name: vehicle.title,
          url: `${site.url}/gallery/${vehicle.slug}`,
          image: vehicle.photos.map((photo) => absoluteUrl(photo.url)),
          ...(vehicle.make
            ? { brand: { "@type": "Brand", name: vehicle.make } }
            : {}),
          ...(vehicle.model ? { model: vehicle.model } : {}),
          ...(vehicle.year ? { vehicleModelDate: String(vehicle.year) } : {}),
          offers: {
            "@type": "Offer",
            availability: "https://schema.org/InStock",
            seller: { "@id": `${site.url}/#organization` },
          },
        }}
      />

      <PageHero
        eyebrow={[vehicle.year, vehicle.make].filter(Boolean).join(" ")}
        title={(vehicle.model || vehicle.title).toUpperCase()}
        subtitle={`Dismantled at our Berkeley Vale yard. If you need something off this car, or off one like it, call ${site.contact.phone} and we will check for you.`}
        actions={[
          { href: "/contact", label: "ASK ABOUT A PART" },
          { href: "/gallery", label: "BACK TO GALLERY" },
        ]}
      />

      <div className="bg-admin py-14 text-white md:py-20">
        <Container>
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[3fr_2fr] lg:gap-14">
            <VehiclePhotos photos={vehicle.photos} title={vehicle.title} />

            <div>
              {/*
                The description is WordPress HTML, cleaned on the way in by
                cleanPostHtml. .blog-body carries the article typography so
                headings and paragraphs read the same here as on a post.
              */}
              <div
                className="blog-body"
                dangerouslySetInnerHTML={{ __html: vehicle.bodyHtml }}
              />

              <div className="border-line bg-card mt-8 rounded-2xl border p-6">
                <p className="mb-1 text-sm text-gray-400">
                  Looking for a part off this car, or one like it?
                </p>
                <a
                  href={`tel:${site.contact.phoneE164}`}
                  className="text-brand-text text-2xl font-extrabold tracking-tight"
                >
                  {site.contact.phone}
                </a>
                <p className="mt-3 text-sm text-gray-400">
                  {site.hours.displayLine}
                </p>
              </div>
            </div>
          </div>

          {related.length > 0 && (
            <div className="mt-16 md:mt-20">
              <h2 className="mb-8 text-2xl font-extrabold tracking-tight md:text-3xl">
                More from the gallery
              </h2>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:gap-8 lg:grid-cols-3">
                {related.map((other) => (
                  <VehicleCard key={other.slug} vehicle={other} />
                ))}
              </div>
              <Link
                href="/gallery"
                className="text-brand-text mt-8 inline-block font-semibold hover:underline"
              >
                See more of the gallery
              </Link>
            </div>
          )}
        </Container>
      </div>

      <ContactFormSection />
    </>
  );
}

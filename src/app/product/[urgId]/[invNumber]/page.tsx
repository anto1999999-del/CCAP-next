import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import JsonLd from "@/components/JsonLd";
import AddToCartButton from "@/components/parts/AddToCartButton";
import PartCard from "@/components/parts/PartCard";
import PartGallery from "@/components/parts/PartGallery";
import { hasPrice } from "@/lib/parts/arrange";
import { loadCatalog, loadGallery } from "@/lib/parts/catalog";
import {
  descriptionText,
  formatItemName,
  formatOdometer,
  orNotRecorded,
  yearLabel,
} from "@/lib/parts/format";
import { partKey } from "@/lib/parts/identity";
import { coverImage, fullImageUrl, thumbnailUrl } from "@/lib/parts/images";
import { formatPrice } from "@/lib/parts/price";
import { findPart } from "@/lib/parts/query";
import { SHIPPING, WARRANTY } from "@/lib/content/part-terms";
import { breadcrumbSchema } from "@/lib/schema/breadcrumbs";
import { absoluteUrl, site } from "@/lib/site";
import type { CatalogPart, PartImage } from "@/lib/parts/types";

type Params = Promise<{ urgId: string; invNumber: string }>;

async function lookup(params: Params): Promise<CatalogPart | null> {
  const { urgId, invNumber } = await params;
  const { parts } = await loadCatalog();
  return findPart(parts, urgId, invNumber);
}

/** "Used Engine for 2015 Toyota Hilux", the way somebody would search for it. */
function vehicleLabel(part: CatalogPart): string {
  const make = part.manufacturer?.trim();
  const model = part.model?.trim();
  const years = part.longIcYear ?? [];
  const year = years.length > 0 ? String(years[0]) : (part.year ?? "");
  return [year, make, model].filter(Boolean).join(" ");
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const part = await lookup(params);
  if (!part) return { title: `Part not found | ${site.name}` };

  const { urgId, invNumber } = await params;
  const name = formatItemName(part.itemName);
  const vehicle = vehicleLabel(part);

  const title = vehicle
    ? `Used ${name} for ${vehicle} | ${site.name} NSW`
    : `Used ${name} | ${site.name} Berkeley Vale NSW`;

  const description = [
    `Quality used ${name}`,
    vehicle ? `for ${vehicle}` : null,
    part.stockNo ? `, stock ${part.stockNo}.` : ".",
    "Sold with warranty. Fast Australia-wide delivery from Central Coast Auto Parts, Berkeley Vale NSW.",
  ]
    .filter(Boolean)
    .join(" ")
    .replace(" ,", ",");

  return {
    title,
    description,
    alternates: { canonical: `/product/${urgId}/${invNumber}` },
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: thumbnailUrl(part) }],
    },
  };
}

/**
 * Photographs of the part first, then anything else, with the yard's business
 * card last. Some feeds lead with a branded card, and a customer opening a part
 * should see the part.
 */
function orderImages(images: readonly PartImage[]): PartImage[] {
  const isPartPhoto = (image: PartImage) =>
    (image.type ?? "").toLowerCase().includes("part");

  const looksPromotional = (image: PartImage) => {
    const text = `${image.img ?? ""}${image.thumb ?? ""}`.toLowerCase();
    return ["centralcoast", "central_coast", "ccautoparts", "hereford", "business", "card", "contact", "logo"].some(
      (marker) => text.includes(marker),
    );
  };

  const photos = images.filter(isPartPhoto);
  const rest = images.filter((image) => !isPartPhoto(image));

  return [
    ...photos,
    ...rest.filter((image) => !looksPromotional(image)),
    ...rest.filter(looksPromotional),
  ];
}

export default async function ProductPage({ params }: { params: Params }) {
  const { urgId, invNumber } = await params;
  const { parts } = await loadCatalog();
  const part = findPart(parts, urgId, invNumber);

  // A part that has sold is gone from the catalogue on the next sync, so this
  // is the ordinary case rather than an error. not-found.tsx handles the wording.
  if (!part) notFound();

  const key = partKey(part);
  const gallery = key ? await loadGallery(key) : [];
  // The catalogue keeps one image per part; the full set is stored separately.
  const images = orderImages(
    gallery.length > 0 ? gallery : (part.images ?? []),
  );

  const name = formatItemName(part.itemName);
  const sellable = hasPrice(part);
  const description = descriptionText(part);

  const related = parts
    .filter(
      (other) =>
        partKey(other) !== key &&
        other.manufacturer === part.manufacturer &&
        other.model === part.model,
    )
    .slice(0, 4);

  return (
    <div className="bg-admin min-h-screen text-white">
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Used Auto Parts", path: "/products" },
          { name, path: `/product/${urgId}/${invNumber}` },
        ])}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name,
          brand: { "@type": "Brand", name: part.manufacturer ?? site.name },
          sku: part.stockNo ?? `${urgId}-${invNumber}`,
          image: images[0] ? [absoluteUrl(fullImageUrl(images[0]))] : [],
          description: description || `Used ${name}`,
          offers: {
            "@type": "Offer",
            priceCurrency: "AUD",
            // Only claim a price when there is one. An unpriced part offered at
            // $0 is a rich result promising something the yard will not honour.
            ...(sellable ? { price: Number(part.price).toFixed(2) } : {}),
            availability: "https://schema.org/InStock",
            url: absoluteUrl(`/product/${urgId}/${invNumber}`),
            seller: { "@id": `${site.url}/#organization` },
          },
        }}
      />

      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6 lg:flex-row">
        <div className="flex-1">
          <PartGallery images={images} name={name} />
        </div>

        <div className="bg-card border-line flex-1 rounded-2xl border p-6">
          <h1 className="mb-4 text-xl font-bold break-words sm:text-2xl md:text-3xl lg:text-4xl">
            {name}
          </h1>

          <dl className="mb-6 space-y-2.5 rounded-xl border-line border bg-tile p-4 text-sm sm:text-base">
            <Row label="Make" value={orNotRecorded(part.manufacturer)} />
            <Row label="Model" value={orNotRecorded(part.model)} />
            <Row label="Year" value={yearLabel(part)} />
            <Row label="Description" value={orNotRecorded(description)} />
            <Row label="Stock number" value={orNotRecorded(part.stockNo)} />
            <Row label="Tag number" value={orNotRecorded(part.tag)} />
            <Row label="Odometer" value={formatOdometer(part.odoReading)} />
            <Row label="Item type" value={orNotRecorded(part.itemTypeCode)} muted />
          </dl>

          {sellable ? (
            <>
              <p className="text-brand-text mb-6 text-2xl font-semibold sm:text-3xl">
                {formatPrice(part.price)}
              </p>
              <AddToCartButton
                className="bg-brand hover:bg-brand-hover w-full rounded px-6 py-3 text-base font-semibold text-white transition-colors sm:text-lg"
                line={{
                  urgId: String(part.urgId),
                  invNumber: String(part.invNumber),
                  itemName: name,
                  manufacturer: part.manufacturer ?? undefined,
                  model: part.model ?? undefined,
                  year: part.year == null ? undefined : String(part.year),
                  price: Number(part.price),
                  thumbnail: coverImage(part) ? thumbnailUrl(part) : undefined,
                }}
              />
            </>
          ) : (
            <div>
              <p className="mb-2 text-2xl font-semibold text-gray-100">
                Contact for price
              </p>
              <p className="mb-6 text-sm text-gray-400">
                This one has not been priced yet. Ring the yard with the stock
                number and we will price it while you wait.
              </p>
              <a
                href={`tel:${site.contact.phoneE164}`}
                className="bg-brand hover:bg-brand-hover block rounded px-6 py-3 text-center text-base font-semibold text-white transition-colors sm:text-lg"
              >
                Call {site.contact.phone}
              </a>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto mt-10 max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Panel title="Details">
            <p className="whitespace-pre-wrap text-gray-300">
              {description ||
                `${name}.${
                  part.longIcYear?.length
                    ? ` Fits ${part.longIcYear.join(", ")}.`
                    : ""
                }`}
            </p>
            {part.comments && part.comments !== description && (
              <p className="mt-4 border-line border-t pt-4 text-sm text-gray-400">
                <span className="font-semibold text-gray-300">Comments: </span>
                {part.comments}
              </p>
            )}
          </Panel>

          <Panel title="Warranty">
            <p className="mb-3 text-gray-300">{WARRANTY.intro}</p>
            <Points points={WARRANTY.points} />
          </Panel>

          <Panel title="Shipping &amp; Handling">
            <p className="mb-3 text-gray-300">{SHIPPING.intro}</p>
            <Points points={SHIPPING.points} />
          </Panel>
        </div>
      </div>

      {related.length > 0 && (
        <div className="mx-auto mt-10 max-w-6xl px-4 py-8 sm:px-6">
          <h2 className="mb-6 text-2xl font-bold text-white sm:text-3xl">
            More from the same vehicle
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((other) => (
              <PartCard key={partKey(other) ?? other.stockNo} part={other} />
            ))}
          </div>
          <Link
            href={`/products?make=${encodeURIComponent(part.manufacturer ?? "")}`}
            className="text-brand-text mt-6 inline-block font-semibold hover:underline"
          >
            See every {part.manufacturer ?? "matching"} part we hold
          </Link>
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div
      className={
        muted
          ? "flex flex-col border-line border-t pt-2 sm:flex-row sm:gap-3"
          : "flex flex-col sm:flex-row sm:gap-3"
      }
    >
      <dt className="shrink-0 text-gray-500 sm:w-40">{label}</dt>
      <dd
        className={
          muted ? "text-gray-300" : "font-medium break-words text-gray-100"
        }
      >
        {value}
      </dd>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-card border-line rounded-2xl border p-6 text-sm sm:text-base">
      <h2 className="text-brand-text mb-3 text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Points({ points }: { points: readonly string[] }) {
  return (
    <ul className="space-y-2 text-sm text-gray-400">
      {points.map((point) => (
        <li key={point} className="flex gap-2">
          <span className="text-brand-text" aria-hidden="true">
            +
          </span>
          <span>{point}</span>
        </li>
      ))}
    </ul>
  );
}

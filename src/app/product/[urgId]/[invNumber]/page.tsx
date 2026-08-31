import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import JsonLd from "@/components/JsonLd";
import Container from "@/components/layout/Container";
import AddToCartButton from "@/components/parts/AddToCartButton";
import PriceRequestForm from "@/components/parts/PriceRequestForm";
import PartCard from "@/components/parts/PartCard";
import PartGallery from "@/components/parts/PartGallery";
import { hasPrice } from "@/lib/parts/arrange";
import { loadCatalog, loadGallery } from "@/lib/parts/catalog";
import {
  descriptionText,
  formatItemName,
  formatOdometer,
  orNotRecorded,
  vehicleLabel,
  yearLabel,
} from "@/lib/parts/format";
import { canonicalPathFor, partKey } from "@/lib/parts/identity";
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

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const part = await lookup(params);
  if (!part) return { title: `Part not found | ${site.name}` };

  const name = formatItemName(part.itemName);
  const vehicle = vehicleLabel(part);

  const title = vehicle
    ? `Used ${name} for ${vehicle} | ${site.name}`
    : `Used ${name} | ${site.name} Berkeley Vale NSW`;

  /*
    Where several identical parts exist, one of them owns the address and the
    rest point here. Sixty-two per cent of the catalogue has a twin, and
    without this they compete with each other in search results instead of
    with other wreckers.
  */
  const { parts: catalogue } = await loadCatalog();
  const canonical = canonicalPathFor(part, catalogue);

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
    alternates: { canonical },
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
    return [
      "centralcoast",
      "central_coast",
      "ccautoparts",
      "hereford",
      "business",
      "card",
      "contact",
      "logo",
    ].some((marker) => text.includes(marker));
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
  const vehicle = vehicleLabel(part);

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
          /*
            The inventory number, not the stock number.

            `stockNo` is the donor vehicle: stock CC0342 is one 2014 Hyundai
            IX35 and 147 parts carry it. Publishing that as the SKU told Google
            those 147 pages were all the same product. `urgId` with `invNumber`
            is the supplier's own key for one physical part, and it is what the
            page's own address is built from.
          */
          sku: `${urgId}-${invNumber}`,
          image: images[0] ? [absoluteUrl(fullImageUrl(images[0]))] : [],
          description: description || `Used ${name}`,
          /*
            Second-hand, stated rather than assumed. Google treats a Product
            with no `itemCondition` as new, which for a wrecker is the one thing
            every listing is not, and it is the difference between appearing in
            a search for a used part and being judged against dealer pricing for
            a new one.
          */
          itemCondition: "https://schema.org/UsedCondition",
          offers: {
            "@type": "Offer",
            priceCurrency: "AUD",
            // Only claim a price when there is one. An unpriced part offered at
            // $0 is a rich result promising something the yard will not honour.
            ...(sellable ? { price: Number(part.price).toFixed(2) } : {}),
            availability: "https://schema.org/InStock",
            itemCondition: "https://schema.org/UsedCondition",
            url: absoluteUrl(`/product/${urgId}/${invNumber}`),
            seller: { "@id": `${site.url}/#organization` },
            /*
              The returns window from the terms page, said once here so the
              two can never drift apart. Google shows this in a product result
              and holds the business to it, so it is deliberately the
              conservative reading of what the terms already promise.
            */
            hasMerchantReturnPolicy: {
              "@type": "MerchantReturnPolicy",
              applicableCountry: "AU",
              returnPolicyCategory:
                "https://schema.org/MerchantReturnFiniteReturnWindow",
              merchantReturnDays: 14,
              returnMethod: "https://schema.org/ReturnByMail",
              returnFees: "https://schema.org/ReturnShippingFees",
            },
          },
        }}
      />

      {/*
        The site's container, like every other page.

        This was `max-w-6xl px-4`, which is 1152 wide with a 16px gutter, where
        the header and footer are 1280 with a 40px one. Every edge on the page
        was a few pixels off the edge above it, which reads as sloppy without
        being obviously wrong.

        The two columns are also no longer `flex-1` each. A photograph and a
        spec table are not the same kind of thing and do not want the same
        width: the picture is what somebody is here to look at, so it takes the
        room and the details column is sized to its content.
      */}
      <Container className="flex flex-col gap-8 py-10 lg:flex-row lg:gap-10">
        <div className="min-w-0 flex-1">
          <PartGallery images={images} name={name} />
        </div>

        <div className="w-full self-start lg:sticky lg:top-24 lg:w-[24rem] lg:shrink-0">
          {/*
            The vehicle first, then the part.

            Somebody reaches this page searching for a part for their own car,
            so the car is the thing that tells them in one line whether they are
            in the right place. It used to be four rows down a grey table.
          */}
          {vehicle && (
            <p className="text-brand-text mb-2 text-xs font-semibold tracking-[0.18em] uppercase">
              {vehicle}
            </p>
          )}

          <h1 className="mb-5 text-2xl leading-tight font-extrabold tracking-tight text-balance break-words md:text-3xl">
            {name}
          </h1>

          <div className="border-line bg-card rounded-2xl border p-6">
            {sellable ? (
              <>
                <p className="text-3xl font-extrabold tabular-nums text-white md:text-4xl">
                  {formatPrice(part.price)}
                </p>
                <p className="mt-1 mb-5 text-xs text-gray-500">
                  Delivery calculated at checkout, or collect from Berkeley Vale
                </p>

                <AddToCartButton
                  className="bg-brand hover:bg-brand-hover w-full rounded-xl px-6 py-3.5 text-base font-semibold text-white transition-colors"
                  line={{
                    urgId: String(part.urgId),
                    invNumber: String(part.invNumber),
                    itemName: name,
                    manufacturer: part.manufacturer ?? undefined,
                    model: part.model ?? undefined,
                    year: part.year == null ? undefined : String(part.year),
                    price: Number(part.price),
                    thumbnail: coverImage(part)
                      ? thumbnailUrl(part)
                      : undefined,
                  }}
                />
              </>
            ) : (
              <>
                <p className="text-2xl font-extrabold text-white md:text-3xl">
                  Price on request
                </p>
                {/*
                  Says we have the part and how to ask. It used to explain that
                  the supplier had not priced it, which is our business, not the
                  customer's, and reads as a yard that does not know its own
                  stock.
                */}
                <p className="mt-1 mb-5 text-xs text-gray-500">
                  We have this one in the yard. Call us or send a request and we
                  will price it for you, quoting stock{" "}
                  {part.stockNo ?? "number"}.
                </p>

                <a
                  href={`tel:${site.contact.phoneE164}`}
                  className="bg-brand hover:bg-brand-hover mb-3 block w-full rounded-xl px-6 py-3.5 text-center text-base font-semibold text-white transition-colors"
                >
                  Call {site.contact.phone}
                </a>

                {/*
                  For everyone who will not ring. The enquiry reaches sales
                  already naming this part, so the first reply is the price.
                */}
                <PriceRequestForm
                  urgId={String(part.urgId)}
                  invNumber={String(part.invNumber)}
                  itemName={name}
                />
              </>
            )}

            {/*
              What every buyer of a second-hand part wants to know before they
              press the button, on three lines rather than in three tall boxes
              further down the page.
            */}
            <ul className="border-line mt-5 space-y-2.5 border-t pt-5 text-sm text-gray-400">
              <Assurance>3 month parts warranty</Assurance>
              <Assurance>Ships Australia-wide, or pick up free</Assurance>
              <Assurance>Inspected before it leaves the yard</Assurance>
            </ul>
          </div>

          {/*
            The specification, as a list rather than a boxed table. Hairlines
            between rows do the same job as a border round the whole thing
            without making it look like a form.
          */}
          <dl className="divide-line border-line mt-4 divide-y rounded-2xl border px-5 text-sm">
            <Row label="Make" value={orNotRecorded(part.manufacturer)} />
            <Row label="Model" value={orNotRecorded(part.model)} />
            <Row label="Fits" value={yearLabel(part)} />
            <Row label="Stock number" value={orNotRecorded(part.stockNo)} />
            <Row label="Tag number" value={orNotRecorded(part.tag)} />
            <Row label="Odometer" value={formatOdometer(part.odoReading)} />
            <Row label="Item type" value={orNotRecorded(part.itemTypeCode)} />
          </dl>
        </div>
      </Container>

      <Container className="pb-4">
        {/*
          The description leads, and the warranty and shipping sit beside it.

          These were three boxes of equal weight across the page, which said the
          terms mattered as much as the part. They are identical on all 32,000
          parts; the description is the only thing on this page that is about
          the part in front of you.
        */}
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <section>
            <h2 className="mb-4 text-lg font-bold text-white">
              About this part
            </h2>
            <p className="text-base leading-relaxed whitespace-pre-wrap text-gray-300">
              {description ||
                `${name}.${
                  part.longIcYear?.length
                    ? ` Fits ${part.longIcYear.join(", ")}.`
                    : ""
                }`}
            </p>
            {part.comments && part.comments !== description && (
              <p className="border-line mt-4 border-t pt-4 text-sm text-gray-400">
                <span className="font-semibold text-gray-300">
                  From the yard:{" "}
                </span>
                {part.comments}
              </p>
            )}
          </section>

          <div className="space-y-4">
            <Terms
              title="Warranty"
              intro={WARRANTY.intro}
              points={WARRANTY.points}
            />
            <Terms
              title="Shipping and handling"
              intro={SHIPPING.intro}
              points={SHIPPING.points}
            />
          </div>
        </div>
      </Container>

      {related.length > 0 && (
        <Container className="py-12">
          <h2 className="mb-6 text-2xl font-extrabold tracking-tight text-white md:text-3xl">
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
        </Container>
      )}
    </div>
  );
}

/**
 * The warranty and the shipping terms, closed by default.
 *
 * The same words on every one of 32,000 parts, so they are reference rather
 * than reading. A native `details` element gives the open and shut behaviour,
 * the keyboard support and the disclosure semantics without a line of
 * JavaScript, and search engines read the contents whether it is open or not.
 */
function Terms({
  title,
  intro,
  points,
}: {
  title: string;
  intro: string;
  points: readonly string[];
}) {
  return (
    <details className="border-line bg-card group rounded-2xl border open:pb-5">
      <summary className="flex cursor-pointer items-center justify-between gap-4 p-5 text-sm font-bold text-white">
        {title}
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4 shrink-0 text-gray-500 transition-transform group-open:rotate-180"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </summary>

      <div className="px-5">
        <p className="mb-3 text-sm leading-relaxed text-gray-300">{intro}</p>
        <Points points={points} />
      </div>
    </details>
  );
}

/** One line of the specification. Label left, value right, on its own row. */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="shrink-0 text-gray-500">{label}</dt>
      <dd className="text-right font-medium break-words text-gray-200">
        {value}
      </dd>
    </div>
  );
}

/** One reassurance in the buy panel: a tick, then the words. */
function Assurance({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <svg
        viewBox="0 0 24 24"
        className="text-brand-text mt-0.5 h-4 w-4 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M20 6L9 17l-5-5" />
      </svg>
      {children}
    </li>
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

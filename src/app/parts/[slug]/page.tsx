import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import JsonLd from "@/components/JsonLd";
import CategoryHero from "@/components/parts/CategoryHero";
import Container from "@/components/layout/Container";
import {
  PART_CATEGORIES,
  findPartCategory,
  type PartCategory,
} from "@/lib/content/part-categories";
import { breadcrumbSchema } from "@/lib/schema/breadcrumbs";
import { site } from "@/lib/site";

type Params = Promise<{ slug: string }>;

/** Seven pages, all known at build time. */
export function generateStaticParams() {
  return PART_CATEGORIES.map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = findPartCategory(slug);
  if (!category) return {};

  // Carried from the live page unchanged: these titles and descriptions are
  // what rank, and are not to be rewritten as part of a rebuild.
  return {
    title: category.title,
    description: category.description,
    alternates: { canonical: `/parts/${category.slug}` },
    openGraph: {
      title: category.title,
      description: category.description,
      type: "website",
      url: `${site.url}/parts/${category.slug}`,
      /*
        Repeated, not inherited. A page that sets `openGraph` replaces the
        parent's whole object rather than merging into it, so leaving this out
        meant these seven pages shared with no image at all while every other
        page on the site had one.
      */
      images: [{ url: site.logo }],
    },
  };
}

/** Reasons to buy here, the same four on every category page. */
const REASONS = [
  {
    icon: "🛡️",
    title: "Warranty on Major Parts",
    description:
      "Major components are sold with warranty so you can buy with confidence.",
  },
  {
    icon: "🚚",
    title: "Fast Dispatch Australia-Wide",
    description:
      "Same-day dispatch where possible. We freight to Sydney, Newcastle, Brisbane, Melbourne and beyond.",
  },
  {
    icon: "🔍",
    title: "Inspected Before Dispatch",
    description:
      "Every part is checked by our team before it leaves our yard in Berkeley Vale NSW.",
  },
  {
    icon: "💬",
    title: "Honest Expert Advice",
    description: `Call ${site.contact.phone} to speak directly with our team about compatibility and condition.`,
  },
] as const;

export default async function PartCategoryPage({ params }: { params: Params }) {
  const { slug } = await params;
  const category = findPartCategory(slug);

  /*
    The live site redirects an unknown slug back to /parts. That is a soft 404:
    a made-up address answers 200 through a redirect, and search engines are
    told a page exists where none does. There are seven of these pages and no
    others, so anything else is genuinely not a page.
  */
  if (!category) notFound();

  const others = PART_CATEGORIES.filter((other) => other.slug !== category.slug);

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Parts by Category", path: "/parts" },
          { name: category.label, path: `/parts/${category.slug}` },
        ])}
      />
      {/*
        The questions were on the page already but only as markup, so they could
        not appear as a rich result. Same wording, now legible to a crawler.
      */}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: category.faq.map((entry) => ({
            "@type": "Question",
            name: entry.question,
            acceptedAnswer: { "@type": "Answer", text: entry.answer },
          })),
        }}
      />

      <CategoryHero
        tagline={category.tagline}
        heading={category.h1}
        intro={category.intro}
      />

      <section className="bg-admin py-14 text-white md:py-20">
        <Container>
          <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2 className="mb-5 text-2xl font-extrabold tracking-tight md:text-3xl">
                What We Stock
              </h2>
              <p className="mb-6 text-sm leading-relaxed text-gray-400 md:text-base">
                {category.body}
              </p>
              <p className="mb-6 text-xs text-gray-500 md:text-sm">
                <span className="font-semibold text-gray-300">
                  Common makes:
                </span>{" "}
                {category.makes}
              </p>

              <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                <StockLink category={category} />
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center border-line rounded-full border px-6 py-3 text-xs font-bold tracking-[0.12em] text-white uppercase transition-colors hover:bg-white/10"
                >
                  Can&apos;t find it? Ask us
                </Link>
              </div>
            </div>

            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {category.items.map((item) => (
                <li
                  key={item}
                  className="border-line bg-card flex items-center gap-3 rounded-2xl border px-5 py-4"
                >
                  <span
                    aria-hidden="true"
                    className="bg-brand h-2 w-2 flex-shrink-0 rounded-full"
                  />
                  <span className="text-sm font-medium text-gray-300">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </section>

      <section className="bg-admin pb-14 text-white md:pb-20">
        <Container>
          <h2 className="mb-10 text-center text-2xl font-extrabold tracking-tight md:text-3xl">
            Why Buy From {site.name}?
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {REASONS.map((reason) => (
              <div
                key={reason.title}
                className="border-line bg-card relative overflow-hidden rounded-2xl border p-6 md:p-7"
              >
                <div className="bg-brand/80 absolute top-0 bottom-0 left-0 w-[3px]" />
                <div className="flex items-start gap-4">
                  <div className="mt-0.5 text-2xl leading-none" aria-hidden="true">
                    {reason.icon}
                  </div>
                  <div>
                    <h3 className="mb-1 text-base font-bold">{reason.title}</h3>
                    <p className="text-sm leading-relaxed text-gray-400">
                      {reason.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-admin pb-14 text-white md:pb-20">
        <Container width="prose">
          <h2 className="mb-10 text-center text-2xl font-extrabold tracking-tight md:text-3xl">
            Frequently Asked Questions
          </h2>
          <div className="space-y-5">
            {category.faq.map((entry) => (
              <div
                key={entry.question}
                className="border-line bg-card rounded-2xl border p-6"
              >
                <h3 className="mb-2 text-base font-bold text-white">
                  {entry.question}
                </h3>
                <p className="text-sm leading-relaxed text-gray-400">
                  {entry.answer}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-admin pb-16 text-white md:pb-20">
        <Container>
          <h2 className="mb-8 text-center text-xl font-extrabold tracking-tight md:text-2xl">
            Browse Other Part Categories
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            {others.map((other) => (
              <Link
                key={other.slug}
                href={`/parts/${other.slug}`}
                className="hover:border-brand/60 inline-flex items-center gap-2 border-line rounded-full border px-5 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:text-white"
              >
                <span aria-hidden="true">{other.icon}</span>
                {other.label}
              </Link>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}

/**
 * Into the catalogue, filtered where the category maps to one part type.
 *
 * This is the link the old page could not offer: it sent everybody to the whole
 * catalogue, so somebody who had just read a page about engines had to find the
 * engines again themselves.
 */
function StockLink({ category }: { category: PartCategory }) {
  const href = category.partType
    ? `/products?part_type=${encodeURIComponent(category.partType)}`
    : "/products";

  return (
    <Link
      href={href}
      className="bg-brand hover:bg-brand-hover inline-flex items-center justify-center rounded-full px-6 py-3 text-xs font-bold tracking-[0.12em] text-white uppercase transition-colors"
    >
      {category.partType ? `Browse our ${category.label.toLowerCase()}` : "Browse our stock"}
    </Link>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import JsonLd from "@/components/JsonLd";
import CategoryHero from "@/components/parts/CategoryHero";
import Container from "@/components/layout/Container";
import { MAKE_PAGES, makePageBySlug } from "@/lib/content/make-pages";
import { PART_CATEGORIES } from "@/lib/content/part-categories";
import { makeStock } from "@/lib/parts/make-stock";
import { breadcrumbSchema } from "@/lib/schema/breadcrumbs";
import { site } from "@/lib/site";

type Params = Promise<{ make: string }>;

/** Ten pages, all known at build time. Cheap to prerender, unlike the catalogue. */
export function generateStaticParams() {
  return MAKE_PAGES.map((page) => ({ make: page.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { make } = await params;
  const page = makePageBySlug(make);
  if (!page) return {};

  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: `/wreckers/${page.slug}` },
    openGraph: {
      title: page.title,
      description: page.description,
      type: "website",
      url: `${site.url}/wreckers/${page.slug}`,
      // Repeated, not inherited: setting openGraph replaces the parent object.
      images: [{ url: site.logo }],
    },
  };
}

/** The four reasons, worded the same as the part-category pages for consistency. */
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

export default async function MakeWreckerPage({ params }: { params: Params }) {
  const { make } = await params;
  const page = makePageBySlug(make);

  // Ten pages and no others: anything else is genuinely not a page, so a real
  // 404 rather than the soft 404 a redirect-to-hub would produce.
  if (!page) notFound();

  // The live figure, injected here so the copy can never quote a stale number.
  const stock = await makeStock(page.make);

  // Prefer the curated models the SEO copy is written around; fall back to what
  // the yard actually holds. Curated is first because the copy references it.
  const models =
    page.popularModels.length > 0
      ? page.popularModels
      : stock.models.slice(0, 8).map((entry) => entry.model);

  const catalogueHref = `/products?make=${encodeURIComponent(page.make)}`;
  const others = MAKE_PAGES.filter((other) => other.slug !== page.slug);
  const paragraphs = page.body.split(/\n\n+/).filter(Boolean);

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Wreckers by Make", path: "/wreckers" },
          { name: page.label, path: `/wreckers/${page.slug}` },
        ])}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: page.faq.map((entry) => ({
            "@type": "Question",
            name: entry.question,
            acceptedAnswer: { "@type": "Answer", text: entry.answer },
          })),
        }}
      />

      <CategoryHero
        tagline={page.tagline}
        heading={page.h1}
        intro={page.intro}
      />

      <section className="bg-admin py-14 text-white md:py-20">
        <Container>
          <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2 className="mb-5 text-2xl font-extrabold tracking-tight md:text-3xl">
                {page.label} Parts in Stock
              </h2>

              {stock.count > 0 && (
                <p className="mb-6 text-sm text-gray-400 md:text-base">
                  We currently hold{" "}
                  <span className="text-brand-text font-bold tabular-nums">
                    {stock.count.toLocaleString("en-AU")}
                  </span>{" "}
                  {page.label} parts in the yard at Berkeley Vale.
                </p>
              )}

              <div className="mb-6 space-y-4 text-sm leading-relaxed text-gray-400 md:text-base">
                {paragraphs.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>

              <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={catalogueHref}
                  className="bg-brand hover:bg-brand-hover inline-flex items-center justify-center rounded-full px-6 py-3 text-xs font-bold tracking-[0.12em] text-white uppercase transition-colors"
                >
                  Browse {page.label} stock
                </Link>
                <Link
                  href="/contact"
                  className="border-line inline-flex items-center justify-center rounded-full border px-6 py-3 text-xs font-bold tracking-[0.12em] text-white uppercase transition-colors hover:bg-white/10"
                >
                  Can&apos;t find it? Ask us
                </Link>
              </div>

              {page.blogSlug && (
                <p className="mt-6 text-sm text-gray-500">
                  Buying guide:{" "}
                  <Link
                    href={`/blog/${page.blogSlug}`}
                    className="text-brand-text underline-offset-4 hover:underline"
                  >
                    read our {page.label} article
                  </Link>
                  .
                </p>
              )}
            </div>

            <div>
              <h3 className="mb-4 text-sm font-semibold tracking-wide text-gray-300 uppercase">
                Popular {page.label} models
              </h3>
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {models.map((model) => (
                  <li
                    key={model}
                    className="border-line bg-card flex items-center gap-3 rounded-2xl border px-5 py-4"
                  >
                    <span
                      aria-hidden="true"
                      className="bg-brand h-2 w-2 flex-shrink-0 rounded-full"
                    />
                    <span className="text-sm font-medium text-gray-300">
                      {model}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-admin pb-14 text-white md:pb-20">
        <Container>
          <h2 className="mb-8 text-center text-xl font-extrabold tracking-tight md:text-2xl">
            {page.label} Parts by Category
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            {PART_CATEGORIES.map((category) => (
              <Link
                key={category.slug}
                href={`/parts/${category.slug}`}
                className="border-line bg-card hover:border-brand rounded-full border px-5 py-2.5 text-sm font-medium text-gray-300 transition-colors"
              >
                {category.label}
              </Link>
            ))}
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
                  <div
                    className="mt-0.5 text-2xl leading-none"
                    aria-hidden="true"
                  >
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
            {page.faq.map((entry) => (
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
            Other Makes We Wreck
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            {others.map((other) => (
              <Link
                key={other.slug}
                href={`/wreckers/${other.slug}`}
                className="border-line bg-card hover:border-brand rounded-full border px-5 py-2.5 text-sm font-medium text-gray-300 transition-colors"
              >
                {other.label}
              </Link>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}

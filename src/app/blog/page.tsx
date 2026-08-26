import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import Container from "@/components/layout/Container";
import PageHero from "@/components/layout/PageHero";
import Pagination from "@/components/layout/Pagination";
import { breadcrumbSchema } from "@/lib/schema/breadcrumbs";
import { listArticles } from "@/lib/blog/repository";
import { site } from "@/lib/site";

const BASE_METADATA: Metadata = {
  title: "Car Parts Blog | Guides & Advice | Central Coast Auto Parts",
  description:
    "Practical guides on used car parts, common faults by make and model, and what to check before you buy. Written by the workshop team at Central Coast Auto Parts.",
  alternates: { canonical: "/blog" },
};

/** Australian format, matching how dates are written elsewhere on the site. */
function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Page one is the blog. Pages two to eight are how you reach it.
 *
 * They used to canonicalise to /blog, which claims they are duplicates of page
 * one when each holds twelve different articles. They point at themselves now
 * and carry `noindex, follow`: every article is in the sitemap and indexed on
 * its own, so the list pages exist to be crawled through rather than found.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}): Promise<Metadata> {
  const { page } = await searchParams;
  const number = Number(page) || 1;

  if (number <= 1) return BASE_METADATA;

  return {
    ...BASE_METADATA,
    alternates: { canonical: `/blog?page=${number}` },
    robots: { index: false, follow: true },
  };
}

/**
 * Twelve to a page.
 *
 * Eighty-seven articles in one column is a page nobody reaches the bottom of,
 * and it made the browser lay out eighty-seven images at once. Page one leads
 * with the newest article and shows eleven more; every page after that is a
 * plain grid of twelve.
 *
 * The page number is in the URL rather than in state, so page four can be
 * linked to, crawled and reached with the back button.
 */
const PER_PAGE = 12;

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const posts = await listArticles();
  const params = await searchParams;

  const pageCount = Math.max(1, Math.ceil(posts.length / PER_PAGE));
  const page = Math.min(Math.max(1, Number(params.page) || 1), pageCount);

  const start = (page - 1) * PER_PAGE;
  const onThisPage = posts.slice(start, start + PER_PAGE);

  // The featured card is page one's alone; later pages are an even grid.
  const latest = page === 1 ? onThisPage[0] : undefined;
  const rest = page === 1 ? onThisPage.slice(1) : onThisPage;

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Blog", path: "/blog" },
        ])}
      />
      {/*
        An ItemList of the articles, so search engines can see this is an index
        of 113 posts rather than one long page of links.
      */}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Blog",
          "@id": `${site.url}/blog#blog`,
          name: "Central Coast Auto Parts Blog",
          url: `${site.url}/blog`,
          publisher: { "@id": `${site.url}/#organization` },
          blogPost: onThisPage.map((post) => ({
            "@type": "BlogPosting",
            headline: post.title,
            url: `${site.url}/blog/${post.slug}`,
            datePublished: post.publishedAt,
            dateModified: post.updatedAt ?? post.publishedAt,
          })),
        }}
      />

      {/*
        Gradient rather than a photograph: the available hero image has
        "EXPLORE OUR SALVAGE VEHICLES" burnt into it, so a heading placed over
        it read as two competing titles.
      */}
      <PageHero
        eyebrow="Guides & advice"
        title="BLOG"
        subtitle="Common faults by make and model, what to check before buying a used part, and how to get more life out of the car you have. Written by the workshop team."
      />

      <div className="bg-admin py-14 text-white md:py-20">
        <Container>

          {latest && (
            <Link
              href={`/blog/${latest.slug}`}
              className="group bg-card hover:border-brand/40 border-line mb-10 grid grid-cols-1 items-center overflow-hidden rounded-2xl border transition-colors md:mb-14 md:grid-cols-2"
            >
              {latest.featuredImage && (
                /*
                  A fixed shape, not the height of the text beside it. With
                  `md:h-full` the picture took whatever height the excerpt
                  happened to give it, so a short excerpt squashed the frame to
                  a letterbox and the crop took the roof and the wheels off the
                  car. The photograph decides its own shape now and the text
                  centres against it.
                */
                <div className="bg-tile-well relative aspect-[16/10]">
                  <Image
                    src={latest.featuredImage.url}
                    alt={latest.featuredImage.alt || latest.title}
                    fill
                    priority
                    sizes="(min-width: 768px) 50vw, 100vw"
                    className="object-cover"
                  />
                </div>
              )}
              <div className="flex flex-col justify-center p-7 md:p-10">
                <p className="text-brand-text mb-3 text-[11px] font-semibold tracking-[0.28em] uppercase">
                  Latest
                </p>
                <h2 className="group-hover:text-brand-text mb-3 text-2xl leading-snug font-bold transition-colors md:text-3xl">
                  {latest.title}
                </h2>
                <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-gray-400 md:text-base">
                  {latest.excerpt}
                </p>
                <p className="text-xs text-gray-500">
                  {formatDate(latest.publishedAt)}
                </p>
              </div>
            </Link>
          )}

          <h2 className="mb-6 text-xl font-extrabold tracking-tight text-white md:text-2xl">
            {page === 1 ? "More from the workshop" : `Articles, page ${page}`}
          </h2>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:gap-8 lg:grid-cols-3">
            {rest.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group bg-card hover:border-brand/40 flex flex-col overflow-hidden rounded-2xl border-line border transition-colors"
              >
                {post.featuredImage && (
                  <div className="bg-tile-well relative aspect-[16/10]">
                    <Image
                      src={post.featuredImage.url}
                      alt={post.featuredImage.alt || post.title}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="group-hover:text-brand-text mb-2 line-clamp-2 text-base leading-snug font-bold transition-colors md:text-lg">
                    {post.title}
                  </h3>
                  <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-gray-400">
                    {post.excerpt}
                  </p>
                  <p className="mt-auto text-xs text-gray-500">
                    {formatDate(post.publishedAt)}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          <Pagination
            page={page}
            pageCount={pageCount}
            totalResults={posts.length}
            shown={onThisPage.length}
            perPage={PER_PAGE}
            noun="articles"
            label="Article pages"
            hrefForPage={(target) =>
              target === 1 ? "/blog" : `/blog?page=${target}`
            }
          />
        </Container>
      </div>
    </>
  );
}

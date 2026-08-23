import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import Container from "@/components/layout/Container";
import PageHero from "@/components/layout/PageHero";
import { breadcrumbSchema } from "@/lib/schema/breadcrumbs";
import { listPosts } from "@/lib/blog/repository";
import { site } from "@/lib/site";

export const metadata: Metadata = {
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

export default function BlogIndexPage() {
  const posts = listPosts();
  const [latest, ...rest] = posts;

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
          blogPost: posts.slice(0, 20).map((post) => ({
            "@type": "BlogPosting",
            headline: post.title,
            url: `${site.url}/blog/${post.slug}`,
            datePublished: post.publishedAt,
            dateModified: post.updatedAt ?? post.publishedAt,
          })),
        }}
      />

      <PageHero title="BLOG" image="/images/cars-hero.webp" />

      <div className="bg-admin py-14 text-white md:py-20">
        <Container>
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <p className="text-brand-text mb-3 text-[11px] font-semibold tracking-[0.28em] uppercase sm:text-xs">
              GUIDES &amp; ADVICE
            </p>
            <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">
              From the workshop
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-white/70 md:text-base">
              Common faults by make and model, what to check before buying a used
              part, and how to get more life out of the car you have.
            </p>
            <div className="bg-brand mx-auto mt-4 h-[3px] w-14 rounded-full" />
          </div>

          {latest && (
            <Link
              href={`/blog/${latest.slug}`}
              className="group bg-card hover:border-brand/40 mb-10 grid grid-cols-1 overflow-hidden rounded-3xl border border-white/10 transition-colors md:mb-14 md:grid-cols-2"
            >
              {latest.featuredImage && (
                <div className="relative aspect-[16/10] md:aspect-auto md:h-full">
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
                <h3 className="group-hover:text-brand-text mb-3 text-2xl leading-snug font-bold transition-colors md:text-3xl">
                  {latest.title}
                </h3>
                <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-white/70 md:text-base">
                  {latest.excerpt}
                </p>
                <p className="text-xs text-white/50">
                  {formatDate(latest.publishedAt)}
                </p>
              </div>
            </Link>
          )}

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:gap-8 lg:grid-cols-3">
            {rest.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group bg-card hover:border-brand/40 flex flex-col overflow-hidden rounded-2xl border border-white/10 transition-colors"
              >
                {post.featuredImage && (
                  <div className="relative aspect-[16/10]">
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
                  <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-white/70">
                    {post.excerpt}
                  </p>
                  <p className="mt-auto text-xs text-white/50">
                    {formatDate(post.publishedAt)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </Container>
      </div>
    </>
  );
}

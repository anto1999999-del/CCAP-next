import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import JsonLd from "@/components/JsonLd";
import Container from "@/components/layout/Container";
import ContactFormSection from "@/components/ContactFormSection";
import { breadcrumbSchema } from "@/lib/schema/breadcrumbs";
import {
  getPost,
  getRelatedPosts,
  listPostSlugs,
} from "@/lib/blog/repository";
import { readingTimeMinutes } from "@/lib/blog/html";
import { absoluteUrl, site } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

/**
 * Every published article is known at build time and prerendered as static
 * HTML, so nothing waits on the database when a reader arrives. Publishing from
 * the admin revalidates the page it affects.
 */
export async function generateStaticParams() {
  return (await listPostSlugs()).map((slug) => ({ slug }));
}

/**
 * Metadata carried across from Yoast verbatim.
 *
 * These articles already rank, one sits around position 11 and is the third
 * most-visited page on the site, so the title and description Google has
 * indexed are reproduced exactly rather than rewritten.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};

  const title = post.seo.metaTitle ?? post.title;
  const description = post.seo.metaDescription ?? post.excerpt;

  return {
    title,
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    // Set from the admin. A published article can still be held back from
    // search results while it is being corrected.
    robots: post.seo.noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      type: "article",
      title,
      description,
      url: `/blog/${post.slug}`,
      publishedTime: post.publishedAt ?? undefined,
      modifiedTime: post.updatedAt ?? undefined,
      images: post.seo.ogImage ? [{ url: post.seo.ogImage }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  // Already rendered and sanitised by the repository, whichever format it was
  // written in.
  const html = post.contentHtml;
  const minutes = readingTimeMinutes(html);
  const related = await getRelatedPosts(slug);

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Blog", path: "/blog" },
          { name: post.title, path: `/blog/${post.slug}` },
        ])}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: post.title,
          description: post.seo.metaDescription ?? post.excerpt,
          datePublished: post.publishedAt,
          dateModified: post.updatedAt ?? post.publishedAt,
          image: post.featuredImage
            ? absoluteUrl(post.featuredImage.url)
            : undefined,
          mainEntityOfPage: `${site.url}/blog/${post.slug}`,
          author: { "@id": `${site.url}/#organization` },
          publisher: { "@id": `${site.url}/#organization` },
        }}
      />

      <article className="bg-admin text-white">
        <Container width="prose" className="py-12 md:py-16">
          <nav className="mb-6 text-sm text-gray-500">
            <Link href="/blog" className="hover:text-brand-text transition-colors">
              ← All articles
            </Link>
          </nav>

          <header className="mb-8">
            {/*
              The first tag, where there is one. This used to print the
              category, which said "Blog" on all 87 articles and told the reader
              nothing they could not see from the address bar.
            */}
            {post.tags[0] && (
              <p className="text-brand-text mb-3 text-[11px] font-semibold tracking-[0.28em] uppercase">
                {post.tags[0].name}
              </p>
            )}
            <h1 className="mb-4 text-3xl leading-tight font-extrabold tracking-tight md:text-4xl lg:text-5xl">
              {post.title}
            </h1>
            <p className="text-sm text-gray-500">
              <time dateTime={post.publishedAt ?? undefined}>
                {formatDate(post.publishedAt)}
              </time>
              {" · "}
              {minutes} min read
            </p>
          </header>

          {post.featuredImage && (
            <div className="relative mb-10 aspect-[16/9] overflow-hidden rounded-2xl">
              <Image
                src={post.featuredImage.url}
                alt={post.featuredImage.alt || post.title}
                fill
                priority
                sizes="(min-width: 768px) 768px, 100vw"
                className="object-cover"
              />
            </div>
          )}

          {/*
            The body is sanitised in cleanPostHtml before it reaches here:
            anything executable is stripped, attributes are allowlisted, and
            links to the old blog subdomain are rewritten to in-app paths.
          */}
          <div
            className="blog-body"
            dangerouslySetInnerHTML={{ __html: html }}
          />

          {post.tags.length > 0 && (
            <div className="mt-12 flex flex-wrap gap-2 border-line border-t pt-8">
              {post.tags.map((tag) => (
                <span
                  key={tag.slug}
                  className="rounded-full border-line border bg-white/5 px-3 py-1 text-xs text-gray-500"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </Container>

        {related.length > 0 && (
          <div className="border-line border-t py-14 md:py-20">
            <Container>
              <h2 className="mb-8 text-2xl font-extrabold tracking-tight md:text-3xl">
                Keep reading
              </h2>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((other) => (
                  <Link
                    key={other.slug}
                    href={`/blog/${other.slug}`}
                    className="group bg-card hover:border-brand/40 flex flex-col overflow-hidden rounded-2xl border-line border transition-colors"
                  >
                    {other.featuredImage && (
                      <div className="relative aspect-[16/10]">
                        <Image
                          src={other.featuredImage.url}
                          alt={other.featuredImage.alt || other.title}
                          fill
                          sizes="(min-width: 1024px) 33vw, 50vw"
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="flex flex-1 flex-col p-6">
                      <h3 className="group-hover:text-brand-text line-clamp-2 text-base leading-snug font-bold transition-colors">
                        {other.title}
                      </h3>
                      <p className="mt-auto pt-4 text-xs text-gray-500">
                        {formatDate(other.publishedAt)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </Container>
          </div>
        )}
      </article>

      <ContactFormSection />
    </>
  );
}

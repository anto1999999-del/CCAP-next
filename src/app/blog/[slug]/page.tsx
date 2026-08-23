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
import { cleanPostHtml, readingTimeMinutes } from "@/lib/blog/html";
import { site } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

/**
 * Every post is known at build time, so all 113 are prerendered as static HTML.
 * Nothing waits on a database or an API when a reader arrives.
 */
export function generateStaticParams() {
  return listPostSlugs().map((slug) => ({ slug }));
}

/**
 * Metadata carried across from Yoast verbatim.
 *
 * These articles already rank — one sits around position 11 and is the third
 * most-visited page on the site — so the title and description Google has
 * indexed are reproduced exactly rather than rewritten.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};

  const title = post.seo.metaTitle ?? post.title;
  const description = post.seo.metaDescription ?? post.excerpt;

  return {
    title,
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.seo.ogTitle ?? title,
      description: post.seo.ogDescription ?? description,
      url: `/blog/${post.slug}`,
      publishedTime: post.publishedAt ?? undefined,
      modifiedTime: post.updatedAt ?? undefined,
      images: post.seo.ogImage ? [{ url: post.seo.ogImage }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.seo.ogTitle ?? title,
      description: post.seo.ogDescription ?? description,
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
  const post = getPost(slug);
  if (!post) notFound();

  const html = cleanPostHtml(post.contentHtml);
  const minutes = readingTimeMinutes(post.contentHtml);
  const related = getRelatedPosts(slug);

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
          image: post.featuredImage?.url,
          mainEntityOfPage: `${site.url}/blog/${post.slug}`,
          author: { "@id": `${site.url}/#organization` },
          publisher: { "@id": `${site.url}/#organization` },
        }}
      />

      <article className="bg-admin text-white">
        <Container className="max-w-3xl py-12 md:py-16">
          <nav className="mb-6 text-sm text-white/50">
            <Link href="/blog" className="hover:text-brand-text transition-colors">
              ← All articles
            </Link>
          </nav>

          <header className="mb-8">
            {post.category && (
              <p className="text-brand-text mb-3 text-[11px] font-semibold tracking-[0.28em] uppercase">
                {post.category}
              </p>
            )}
            <h1 className="mb-4 text-3xl leading-tight font-extrabold tracking-tight md:text-4xl lg:text-5xl">
              {post.title}
            </h1>
            <p className="text-sm text-white/50">
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
            <div className="mt-12 flex flex-wrap gap-2 border-t border-white/10 pt-8">
              {post.tags.map((tag) => (
                <span
                  key={tag.slug}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </Container>

        {related.length > 0 && (
          <div className="border-t border-white/5 py-14 md:py-20">
            <Container>
              <h2 className="mb-8 text-2xl font-extrabold tracking-tight md:text-3xl">
                Keep reading
              </h2>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((other) => (
                  <Link
                    key={other.slug}
                    href={`/blog/${other.slug}`}
                    className="group bg-card hover:border-brand/40 flex flex-col overflow-hidden rounded-2xl border border-white/10 transition-colors"
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
                      <p className="mt-auto pt-4 text-xs text-white/50">
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

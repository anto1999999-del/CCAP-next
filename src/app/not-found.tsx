import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";

/**
 * Not-found page.
 *
 * Two improvements over the version it replaces, both of which needed a
 * framework that renders on the server:
 *
 * **It returns a real HTTP 404.** The old single-page app could only ever
 * answer 200 and then ask crawlers not to index the page, because the server
 * had already sent a successful response before the router knew the URL was
 * unknown. A genuine 404 is a far stronger signal, and it is what stops the
 * invented URLs that spam sites link to from being treated as real pages.
 *
 * **The robots directives no longer contradict each other.** The old build
 * shipped `index,follow` statically in index.html and injected `noindex,follow`
 * over the top, leaving the page carrying both an instruction to index it and
 * one not to. Google resolved that in our favour, but a page whose own tags
 * disagree is a bug waiting to be read the other way.
 *
 * Next emits two robots tags here, a bare `noindex`, and `noindex, follow`
 * from overriding the layout's inherited value. Both say the same thing (a bare
 * `noindex` implies `follow`, since following is the default), so there is no
 * conflict to resolve. No `robots` field is set below, because adding one only
 * produces a third tag saying it again.
 */
export const metadata: Metadata = {
  title: "Page Not Found | Central Coast Auto Parts",
  description:
    "The page you are looking for does not exist. Browse used car parts from our Berkeley Vale yard.",
};

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-20 text-center">
      <p className="text-brand text-6xl font-bold lg:text-8xl">404</p>

      <h1 className="mt-4 text-2xl font-bold text-white lg:text-4xl">
        We couldn&apos;t find that page
      </h1>

      {/*
        Deliberately lighter than the original, which used gray-600 on black, about 3.2:1, below the 4.5:1 minimum for body text and genuinely hard to
        read. The copy is unchanged; only the contrast is corrected.
      */}
      <p className="mt-4 max-w-xl text-gray-300">
        The link may be out of date, or the page may have been moved. You can
        search our current stock by year, make and model, or call the yard on{" "}
        <a
          href={`tel:${site.contact.phoneE164}`}
          className="text-brand-text font-semibold hover:underline"
        >
          (02) 4388 1818
        </a>{" "}
        and we&apos;ll check availability for you.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <Link
          href="/products"
          className="bg-brand hover:bg-brand-hover rounded-md px-6 py-3 font-semibold text-white transition-colors"
        >
          Search Parts
        </Link>
        <Link
          href="/"
          className="rounded-md border border-gray-500 px-6 py-3 text-white transition-colors hover:bg-white/10"
        >
          Back to Home
        </Link>
        <Link
          href="/contact"
          className="rounded-md border border-gray-500 px-6 py-3 text-white transition-colors hover:bg-white/10"
        >
          Contact Us
        </Link>
      </div>
    </div>
  );
}

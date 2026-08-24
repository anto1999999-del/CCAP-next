import Link from "next/link";
import { BRAND_GRADIENT } from "@/components/layout/PageHero";

/**
 * The hero on /parts and its category pages.
 *
 * Separate from PageHero because these headings are sentences, not labels:
 * "Used Gearboxes & Transmissions, Central Coast NSW" at the size PageHero uses
 * would take four lines. The wash behind it is the same one, imported rather
 * than copied.
 */
export default function CategoryHero({
  tagline,
  heading,
  intro,
}: {
  tagline: string;
  heading: string;
  intro: string;
}) {
  return (
    <section className="px-6 py-20 md:py-28" style={BRAND_GRADIENT}>
      <div className="mx-auto max-w-4xl text-center">
        <p className="text-brand-text mb-5 text-[11px] font-semibold tracking-[0.28em] uppercase sm:text-xs">
          {tagline}
        </p>
        <h1 className="mb-6 text-3xl leading-tight font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl">
          {heading}
        </h1>
        <p className="mx-auto mb-10 max-w-3xl text-sm leading-relaxed text-white/80 md:text-base">
          {intro}
        </p>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/products"
            className="bg-brand hover:bg-brand-hover inline-flex min-w-[220px] items-center justify-center rounded-full px-8 py-3.5 text-xs font-bold tracking-[0.12em] text-white uppercase shadow-[0_0_28px_rgba(233,22,47,0.45)] transition-colors sm:text-sm"
          >
            Browse all parts
          </Link>
          <Link
            href="/contact"
            className="inline-flex min-w-[220px] items-center justify-center rounded-full border border-white/90 bg-transparent px-8 py-3.5 text-xs font-bold tracking-[0.12em] text-white uppercase transition-colors hover:bg-white/10 sm:text-sm"
          >
            Request a part
          </Link>
        </div>
      </div>
    </section>
  );
}

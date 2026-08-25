import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import Container from "./Container";

/**
 * The banner at the top of an interior page.
 *
 * One component, so every hero is the same height, aligns to the same gutter,
 * and sizes its heading the same way. About and Sell Your Car were built
 * separately and had drifted into looking like two different websites.
 *
 * Two treatments:
 *
 * - **photo**, a photograph behind a scrim. For pages whose image carries
 *   meaning, like the yard shot on About.
 * - **gradient**, the brand wash used on the home page hero, with no
 *   photograph at all. This is the right choice whenever the available image
 *   has words burnt into it. `cars-hero.webp` reads "EXPLORE OUR SALVAGE
 *   VEHICLES", so putting a heading over it produced two competing titles.
 */

type HeroAction = { href: string; label: string };

/**
 * The brand wash used behind headings across the site.
 *
 * Exported because three pages need it at three different heading sizes: the
 * home page, the interior heroes here, and the part-category landing pages,
 * whose headings are full sentences and cannot take the size this component
 * uses. Copying the gradient into each of them is how the old codebase ended up
 * with the same red written out 212 times.
 */
export const BRAND_GRADIENT = {
  backgroundColor: "#050505",
  backgroundImage: `
    radial-gradient(ellipse 120% 80% at 0% 50%, rgba(233, 22, 47, 0.45), transparent 55%),
    radial-gradient(ellipse 70% 50% at 100% 0%, rgba(233, 22, 47, 0.12), transparent 45%),
    linear-gradient(100deg, #2a0c10 0%, #12080a 28%, #080808 55%, #050505 100%)
  `,
} as const;

export default function PageHero({
  title,
  eyebrow,
  subtitle,
  image,
  actions = [],
  children,
}: {
  title: string;
  /** Small caps line above the title. */
  eyebrow?: string;
  subtitle?: string;
  /** Path under /images. Omit for the gradient treatment. */
  image?: string;
  actions?: readonly HeroAction[];
  children?: ReactNode;
}) {
  return (
    <div
      className="relative flex h-[330px] items-center sm:h-[380px] lg:h-[455px]"
      style={image ? undefined : BRAND_GRADIENT}
    >
      {image && (
        <>
          <Image
            src={image}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          {/*
            The heading sits on a photograph, so its contrast would otherwise
            depend on whichever part of the image happened to be behind it.
          */}
          <div className="absolute inset-0 bg-black/45" />
        </>
      )}

      <Container className="relative">
        {eyebrow && (
          <p className="text-brand-text mb-4 text-[11px] font-semibold tracking-[0.28em] uppercase sm:text-xs sm:tracking-[0.35em]">
            {eyebrow}
          </p>
        )}

        <h1 className="text-[40px] leading-[1.05] font-bold tracking-[0.02em] text-white sm:text-5xl lg:text-7xl">
          {title}
        </h1>

        {subtitle && (
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-gray-300 md:text-base lg:text-lg">
            {subtitle}
          </p>
        )}

        {children}

        {actions.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-4">
            {actions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="bg-brand hover:bg-brand-hover rounded-md px-5 py-2.5 font-semibold text-white transition-colors"
              >
                {action.label}
              </Link>
            ))}
          </div>
        )}
      </Container>
    </div>
  );
}

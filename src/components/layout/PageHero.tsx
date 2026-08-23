import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import Container from "./Container";

/**
 * The banner at the top of an interior page.
 *
 * One component, so every hero on the site is the same height, uses the same
 * scrim, aligns its heading to the same gutter as the rest of the page, and
 * sizes that heading the same way.
 *
 * They were built twice and diverged: About was 320px rising to 384px with a
 * dark overlay, a container-aligned heading at 48px/96px and two buttons; Sell
 * Your Car was 330px rising to 455px, no overlay at all, its heading fixed at
 * 40px and pushed in with a hardcoded 100px margin, centred on small screens and
 * left-aligned above 800px. Side by side they read as two different websites.
 */

type HeroAction = {
  href: string;
  label: string;
};

export default function PageHero({
  title,
  image,
  actions = [],
  children,
}: {
  title: string;
  /** Path under /images. Loaded eagerly — it is the page's largest paint. */
  image: string;
  actions?: readonly HeroAction[];
  children?: ReactNode;
}) {
  return (
    <div className="relative flex h-[330px] items-center sm:h-[380px] lg:h-[455px]">
      <Image
        src={image}
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />

      {/*
        The heading sits on a photograph, so its contrast would otherwise depend
        on whichever part of the image happened to be behind it. This scrim
        guarantees it. Sell Your Car had none at all.
      */}
      <div className="absolute inset-0 bg-black/45" />

      <Container className="relative">
        <h1 className="text-[40px] leading-[1.05] font-bold tracking-[0.02em] text-white sm:text-5xl lg:text-7xl">
          {title}
        </h1>

        {children}

        {actions.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-4">
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

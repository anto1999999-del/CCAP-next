"use client";

import { useState } from "react";
import { PART_IMAGE_PLACEHOLDER } from "@/lib/parts/images";

/**
 * A part photograph that degrades visibly.
 *
 * The supplier's image host fails often enough that this matters: when it does,
 * the browser is left with a broken image icon unless something replaces it.
 * This is the only part of a card that needs to run in the browser, so it is
 * the only part that does.
 */
export default function PartThumbnail({
  src,
  alt,
  className = "",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed || src === PART_IMAGE_PLACEHOLDER) {
    return (
      <div
        className={`bg-tile-well flex items-center justify-center text-xs tracking-wider text-white/35 uppercase ${className}`}
      >
        No photo
      </div>
    );
  }

  return (
    // Not next/image: these are proxied through a route that already caches
    // them, and the supplier sends one fixed size, so there is nothing for the
    // optimiser to do but add a second copy of every file.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

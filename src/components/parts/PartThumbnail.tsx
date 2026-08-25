"use client";

import { useState } from "react";
import { PART_IMAGE_PLACEHOLDER } from "@/lib/parts/images";

/**
 * A part photograph that degrades visibly.
 *
 * The supplier's image host fails often enough that a broken image icon would
 * be a regular sight: under a sustained warm-up it dropped roughly one request
 * in twenty, and 38 of its small copies are missing outright.
 *
 * So a failure falls back to the part's other copy of the same photograph
 * before it falls back to wording. The two copies are stored separately and
 * fail independently, so the one that is there covers for the one that is not.
 * This is the only part of a card that has to run in the browser, because
 * whether an image loads is not knowable until it is tried.
 */
export default function PartThumbnail({
  src,
  fallbackSrc,
  alt,
  className = "",
}: {
  src: string;
  /** Tried once if `src` fails. The small copy, where `src` is the large one. */
  fallbackSrc?: string;
  alt: string;
  className?: string;
}) {
  const [current, setCurrent] = useState(src);
  const [failed, setFailed] = useState(false);

  // A new part is a new photograph, even where React reuses this element.
  const [renderedFor, setRenderedFor] = useState(src);
  if (renderedFor !== src) {
    setRenderedFor(src);
    setCurrent(src);
    setFailed(false);
  }

  if (failed || current === PART_IMAGE_PLACEHOLDER) {
    return (
      <div
        className={`bg-tile-well flex items-center justify-center text-xs tracking-wider text-gray-500 uppercase ${className}`}
      >
        No photo
      </div>
    );
  }

  return (
    // Not next/image: these are proxied through a route that already caches
    // them, and the supplier sends one fixed size, so there is nothing for the
    // optimiser to do but keep a second copy of every file.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={current}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => {
        if (fallbackSrc && current !== fallbackSrc) setCurrent(fallbackSrc);
        else setFailed(true);
      }}
      className={className}
    />
  );
}

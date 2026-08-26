"use client";

import { useState } from "react";
import PartThumbnail from "./PartThumbnail";
import { fullImageUrl, thumbUrl } from "@/lib/parts/images";
import type { PartImage } from "@/lib/parts/types";

/**
 * The photographs of one part.
 *
 * The thumbnail strip scrolls and the chosen photograph stays selected. On the
 * current site the strip is a fixed row that shows the first seven and cannot
 * be moved, so a part with more photographs than that has some the customer
 * cannot reach.
 */
export default function PartGallery({
  images,
  name,
}: {
  images: readonly PartImage[];
  name: string;
}) {
  const [selected, setSelected] = useState(0);
  const [expanded, setExpanded] = useState(false);

  if (images.length === 0) {
    return (
      <div className="bg-tile-well flex aspect-[4/3] w-full items-center justify-center rounded-xl border-line border text-sm tracking-wider text-gray-500 uppercase">
        No photo
      </div>
    );
  }

  const current = images[Math.min(selected, images.length - 1)];

  /*
    Five, then a tile saying how many more. Six across on a wide screen, so the
    strip is one row until somebody asks for the rest.
  */
  const PREVIEW = 5;
  const shown = expanded ? images : images.slice(0, PREVIEW);
  const hidden = images.length - shown.length;

  return (
    <div className="w-full">
      <div className="bg-tile-well border-line overflow-hidden rounded-2xl border">
        <PartThumbnail
          key={fullImageUrl(current)}
          src={fullImageUrl(current)}
          fallbackSrc={thumbUrl(current)}
          alt={name}
          className="aspect-[4/3] w-full object-contain"
        />
      </div>

      {images.length > 1 && (
        <>
          <div
            role="group"
            aria-label={`Photographs of this ${name}`}
            className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-6"
          >
            {shown.map((image, index) => (
              <button
                key={fullImageUrl(image)}
                type="button"
                onClick={() => setSelected(index)}
                aria-label={`Show photo ${index + 1} of ${images.length}`}
                aria-pressed={index === selected}
                className={`overflow-hidden rounded-lg border transition-colors ${
                  index === selected
                    ? "border-brand"
                    : "border-line hover:border-white/40"
                }`}
              >
                <PartThumbnail
                  src={thumbUrl(image)}
                  alt=""
                  className="aspect-[4/3] w-full object-cover"
                />
              </button>
            ))}

            {/*
              The rest, behind a count rather than on the page.

              Some donor vehicles carry sixty photographs. Wrapping them all
              put ten rows of car above the part somebody came to buy, and
              scrolling them sideways hid most of them behind a scrollbar that
              looked like a fault. Five and a number is what a person can take
              in, and the number says there is more.
            */}
            {!expanded && hidden > 0 && (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="border-line hover:border-brand/60 bg-tile-well flex aspect-[4/3] w-full flex-col items-center justify-center rounded-lg border text-xs font-semibold text-gray-300 transition-colors"
              >
                <span className="text-base font-extrabold tabular-nums">
                  +{hidden}
                </span>
                <span className="text-gray-500">more</span>
              </button>
            )}
          </div>

          {expanded && (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="border-line hover:border-white/30 mt-3 rounded-lg border px-4 py-2 text-xs font-semibold text-gray-300 transition-colors"
            >
              Show fewer photos
            </button>
          )}
        </>
      )}

    </div>
  );
}

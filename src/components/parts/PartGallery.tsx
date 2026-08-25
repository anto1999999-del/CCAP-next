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

  if (images.length === 0) {
    return (
      <div className="bg-tile-well flex aspect-[4/3] w-full items-center justify-center rounded-xl border-line border text-sm tracking-wider text-gray-500 uppercase">
        No photo
      </div>
    );
  }

  const current = images[Math.min(selected, images.length - 1)];

  return (
    <div className="w-full">
      <div className="bg-tile-well overflow-hidden rounded-xl border-line border">
        <PartThumbnail
          key={fullImageUrl(current)}
          src={fullImageUrl(current)}
          fallbackSrc={thumbUrl(current)}
          alt={name}
          className="aspect-[4/3] w-full object-contain"
        />
      </div>

      {images.length > 1 && (
        <div
          role="group"
          aria-label={`Photographs of this ${name}`}
          className="mt-3 flex gap-3 overflow-x-auto pb-2"
        >
          {images.map((image, index) => (
            <button
              key={fullImageUrl(image)}
              type="button"
              onClick={() => setSelected(index)}
              aria-label={`Show photo ${index + 1} of ${images.length}`}
              aria-pressed={index === selected}
              className={`shrink-0 overflow-hidden rounded-md border transition-colors ${
                index === selected
                  ? "border-brand"
                  : "border-line hover:border-white/40"
              }`}
            >
              <PartThumbnail
                src={thumbUrl(image)}
                alt=""
                className="h-20 w-24 object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import Image from "next/image";
import { useState } from "react";
import type { GalleryPhoto } from "@/lib/blog/gallery";

/**
 * The photographs of one vehicle: a large shot with a strip of thumbnails.
 *
 * WordPress stacked all five full width, so looking at a car meant scrolling
 * past it. Here they are all reachable without scrolling, and the selected one
 * stays large.
 *
 * Every photograph is rendered into the markup rather than swapped through a
 * single element, so all five are in the HTML for crawlers and the ones that
 * are not showing cost nothing but a hidden element.
 */
export default function VehiclePhotos({
  photos,
  title,
}: {
  photos: readonly GalleryPhoto[];
  title: string;
}) {
  const [selected, setSelected] = useState(0);

  if (photos.length === 0) return null;

  return (
    <div>
      <div className="bg-tile-well relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/10">
        {photos.map((photo, index) => (
          <Image
            key={photo.url}
            src={photo.url}
            alt={photo.alt || `${title} - photo ${index + 1}`}
            fill
            // Only the shot that loads first is worth prioritising.
            priority={index === 0}
            sizes="(min-width: 1024px) 60vw, 100vw"
            className={`object-cover transition-opacity duration-300 ${
              index === selected ? "opacity-100" : "opacity-0"
            }`}
            aria-hidden={index === selected ? undefined : true}
          />
        ))}
      </div>

      {photos.length > 1 && (
        <div
          role="group"
          aria-label={`Photographs of the ${title}`}
          className="mt-3 grid grid-cols-5 gap-3"
        >
          {photos.map((photo, index) => (
            <button
              key={photo.url}
              type="button"
              onClick={() => setSelected(index)}
              aria-label={`Show photo ${index + 1} of ${photos.length}`}
              aria-pressed={index === selected}
              className={`relative aspect-[4/3] overflow-hidden rounded-lg border transition-colors ${
                index === selected
                  ? "border-brand"
                  : "border-white/10 hover:border-white/35"
              }`}
            >
              <Image
                src={photo.url}
                alt=""
                fill
                sizes="20vw"
                className={`object-cover transition-opacity ${
                  index === selected ? "opacity-100" : "opacity-70 hover:opacity-100"
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

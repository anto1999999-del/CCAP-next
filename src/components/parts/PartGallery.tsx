"use client";

import { useState } from "react";
import PartThumbnail from "./PartThumbnail";
import { fullImageUrl, thumbUrl } from "@/lib/parts/images";
import type { PartImage } from "@/lib/parts/types";

/**
 * The photographs of a part.
 *
 * A rail of thumbnails beside one large image, which is how every shop people
 * already use presents a product, and it is the layout that works when a donor
 * vehicle carries sixty photographs.
 *
 * Two earlier attempts are worth recording so nobody repeats them. Scrolling
 * the thumbnails sideways put a native scrollbar under them that looked like a
 * fault and hid most of the photographs behind it. Wrapping them instead showed
 * all sixty at once, which buried the part somebody came to buy under ten rows
 * of car. A "+55 more" tile fixed the height and added a button that had to be
 * pressed before the photographs could be seen at all.
 *
 * The rail scrolls in its own column with the count on the image, so nothing is
 * hidden, nothing has to be pressed, and the part stays the biggest thing on
 * the page.
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
      <div className="bg-tile-well border-line flex aspect-[4/3] w-full items-center justify-center rounded-2xl border text-sm tracking-wider text-gray-500 uppercase">
        No photo
      </div>
    );
  }

  const index = Math.min(selected, images.length - 1);
  const current = images[index];

  const step = (by: number) =>
    setSelected((was) => (was + by + images.length) % images.length);

  return (
    <div className="flex flex-col-reverse gap-3 lg:flex-row lg:gap-4">
      {images.length > 1 && (
        <div
          role="group"
          aria-label={`Photographs of this ${name}`}
          /*
            A row on a phone, a column beside the image on a desktop. Both
            scroll, and `scrollbar-none` hides the bar rather than the content:
            the fade at the end is what says there is more, which is quieter
            than a scrollbar and does not look broken.
          */
          className="scrollbar-none flex gap-2 overflow-x-auto lg:max-h-[32rem] lg:w-20 lg:flex-col lg:overflow-x-visible lg:overflow-y-auto"
        >
          {images.map((image, position) => (
            <button
              key={fullImageUrl(image)}
              type="button"
              onClick={() => setSelected(position)}
              aria-label={`Show photo ${position + 1} of ${images.length}`}
              aria-pressed={position === index}
              className={`w-16 shrink-0 overflow-hidden rounded-lg border transition-all lg:w-full ${
                position === index
                  ? "border-brand opacity-100"
                  : "border-line opacity-60 hover:opacity-100"
              }`}
            >
              <PartThumbnail
                src={thumbUrl(image)}
                alt=""
                className="aspect-square w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      <div className="group bg-tile-well border-line relative min-w-0 flex-1 overflow-hidden rounded-2xl border">
        <PartThumbnail
          key={fullImageUrl(current)}
          src={fullImageUrl(current)}
          fallbackSrc={thumbUrl(current)}
          alt={name}
          className="aspect-[4/3] w-full object-contain"
        />

        {images.length > 1 && (
          <>
            {/*
              Arrows on hover, and always on a touch screen, where there is no
              hover to reveal them.
            */}
            <Arrow side="left" onClick={() => step(-1)} label="Previous photo" />
            <Arrow side="right" onClick={() => step(1)} label="Next photo" />

            <p
              aria-live="polite"
              className="absolute right-3 bottom-3 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold tabular-nums backdrop-blur-sm"
            >
              {index + 1} / {images.length}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function Arrow({
  side,
  onClick,
  label,
}: {
  side: "left" | "right";
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`absolute top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2.5 text-white backdrop-blur-sm transition-all hover:bg-black/80 focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100 ${
        side === "left" ? "left-3" : "right-3"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={side === "left" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"} />
      </svg>
    </button>
  );
}

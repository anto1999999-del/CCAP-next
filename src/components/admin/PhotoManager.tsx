"use client";

import { useRef, useState } from "react";
import { uploadImage } from "./ImagePicker";
import type { ContentImage } from "@/lib/content/schema";

/**
 * The set of photographs on a gallery vehicle.
 *
 * A car is photographed a dozen times in one go, so this takes several files at
 * once and uploads them one after another rather than making somebody repeat the
 * same four clicks twelve times.
 *
 * The first photograph is the cover: it is what the gallery index shows and what
 * gets shared when somebody posts the link. That is why order is editable and
 * why "Make cover" exists as its own button rather than being a drag nobody
 * discovers.
 */

export default function PhotoManager({
  photos,
  onChange,
}: {
  photos: ContentImage[];
  onChange: (photos: ContentImage[]) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [failures, setFailures] = useState<string[]>([]);

  async function add(files: FileList | null) {
    if (!files || files.length === 0) return;

    const chosen = Array.from(files);
    const added: ContentImage[] = [];
    const failed: string[] = [];

    for (const [index, file] of chosen.entries()) {
      setProgress(`Uploading ${index + 1} of ${chosen.length}...`);

      const result = await uploadImage(file);
      if (result.ok) added.push(result.image);
      else failed.push(`${file.name}: ${result.message}`);
    }

    // Applied once at the end, so a batch of twelve is one change rather than
    // twelve renders and twelve chances to lose one.
    if (added.length > 0) onChange([...photos, ...added]);

    setFailures(failed);
    setProgress(null);
    if (input.current) input.current.value = "";
  }

  function replace(index: number, photo: ContentImage) {
    onChange(photos.map((current, at) => (at === index ? photo : current)));
  }

  function move(index: number, by: number) {
    const target = index + by;
    if (target < 0 || target >= photos.length) return;

    const next = [...photos];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function makeCover(index: number) {
    const next = [...photos];
    const [photo] = next.splice(index, 1);
    onChange([photo, ...next]);
  }

  function remove(index: number) {
    onChange(photos.filter((_, at) => at !== index));
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={progress !== null}
          className="bg-brand hover:bg-brand-hover rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-60"
        >
          {progress ?? "Add photos"}
        </button>
        <span className="text-xs text-gray-500">
          {photos.length === 0
            ? "WebP, JPEG or PNG, up to 1MB each. Pick as many as you like at once."
            : `${photos.length} ${photos.length === 1 ? "photo" : "photos"}. The first one is the cover.`}
        </span>
      </div>

      {failures.length > 0 && (
        <ul role="alert" className="text-brand-text mb-4 space-y-1 text-xs">
          {failures.map((failure) => (
            <li key={failure}>{failure}</li>
          ))}
        </ul>
      )}

      {photos.length === 0 ? (
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="border-line hover:border-brand/60 flex h-40 w-full items-center justify-center rounded-xl border border-dashed bg-field text-sm text-gray-500 transition-colors"
        >
          No photos yet. Add the first one.
        </button>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {photos.map((photo, index) => (
            <li
              key={`${photo.url}-${index}`}
              className="border-line bg-card overflow-hidden rounded-xl border"
            >
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={photo.alt || `Photo ${index + 1}`}
                  className="h-40 w-full object-cover"
                />
                {index === 0 && (
                  <span className="bg-brand absolute top-2 left-2 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide text-white uppercase">
                    Cover
                  </span>
                )}
              </div>

              <div className="space-y-3 p-3">
                <input
                  value={photo.alt}
                  onChange={(event) =>
                    replace(index, { ...photo, alt: event.target.value })
                  }
                  placeholder="Describe this photo"
                  aria-label={`Description for photo ${index + 1}`}
                  className="focus:border-brand border-line w-full rounded-lg border bg-field px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none"
                />

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label={`Move photo ${index + 1} earlier`}
                    className="border-line rounded-lg border px-2.5 py-1 text-xs text-gray-300 transition-colors hover:border-white/30 disabled:opacity-30"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === photos.length - 1}
                    aria-label={`Move photo ${index + 1} later`}
                    className="border-line rounded-lg border px-2.5 py-1 text-xs text-gray-300 transition-colors hover:border-white/30 disabled:opacity-30"
                  >
                    Forward
                  </button>
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => makeCover(index)}
                      className="border-line rounded-lg border px-2.5 py-1 text-xs text-gray-300 transition-colors hover:border-white/30"
                    >
                      Make cover
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="text-brand-text ml-auto rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors hover:bg-white/5"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={input}
        type="file"
        multiple
        accept="image/webp,image/jpeg,image/png,image/avif,image/gif"
        onChange={(event) => add(event.target.files)}
        className="hidden"
      />
    </div>
  );
}

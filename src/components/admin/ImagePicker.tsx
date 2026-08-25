"use client";

import { useRef, useState } from "react";
import type { ContentImage } from "@/lib/content/schema";

/**
 * Choosing an image, and the upload behind it.
 *
 * The size limit is checked here as well as on the server. The server is what
 * enforces it; this is so somebody who picks a 4MB photograph is told
 * immediately instead of watching it upload and then fail.
 */

export const MAX_BYTES = 1024 * 1024;

export async function uploadImage(
  file: File,
): Promise<{ ok: true; image: ContentImage } | { ok: false; message: string }> {
  if (file.size > MAX_BYTES) {
    return {
      ok: false,
      message: `That image is ${(file.size / 1024 / 1024).toFixed(1)}MB. The limit is 1MB, so resize it first.`,
    };
  }

  const body = new FormData();
  body.append("file", file);

  const response = await fetch("/api/media", { method: "POST", body });
  const result = await response.json().catch(() => null);

  if (!response.ok || !result?.ok) {
    return {
      ok: false,
      message: result?.message ?? "That image could not be uploaded.",
    };
  }

  return {
    ok: true,
    image: {
      url: result.image.url,
      alt: "",
      width: result.image.width,
      height: result.image.height,
    },
  };
}

/** A single image with a preview, used for an article's cover shot. */
export default function ImagePicker({
  label,
  hint,
  image,
  onChange,
}: {
  label: string;
  hint?: string;
  image: ContentImage | null;
  onChange: (image: ContentImage | null) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function choose(file: File | undefined) {
    if (!file) return;

    setBusy(true);
    setError(null);

    const result = await uploadImage(file);
    if (result.ok) onChange(result.image);
    else setError(result.message);

    setBusy(false);
    // Cleared so picking the same file again still fires a change event.
    if (input.current) input.current.value = "";
  }

  return (
    <div>
      <span className="mb-2 block text-xs font-semibold tracking-wider text-gray-400 uppercase">
        {label}
      </span>

      {image ? (
        <div className="border-line bg-card overflow-hidden rounded-xl border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.url}
            alt={image.alt || "Selected image"}
            className="h-44 w-full object-cover"
          />
          <div className="space-y-3 p-4">
            <label className="block">
              <span className="mb-1.5 block text-xs text-gray-500">
                Describe the picture, for search engines and screen readers
              </span>
              <input
                value={image.alt}
                onChange={(event) =>
                  onChange({ ...image, alt: event.target.value })
                }
                placeholder="Used Toyota Hilux engine on a stand"
                className="focus:border-brand border-line w-full rounded-lg border bg-[#0b0b0d] px-3 py-2 text-sm text-white focus:outline-none"
              />
            </label>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => input.current?.click()}
                className="border-line rounded-lg border px-3 py-1.5 text-xs font-semibold text-gray-200 transition-colors hover:border-white/30"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={() => onChange(null)}
                className="text-brand-text rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-white/5"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          className="border-line hover:border-brand/60 flex h-44 w-full flex-col items-center justify-center rounded-xl border border-dashed bg-[#0b0b0d] text-sm text-gray-400 transition-colors disabled:opacity-60"
        >
          {busy ? "Uploading..." : "Choose an image"}
          <span className="mt-1 text-xs text-gray-600">
            {hint ?? "WebP, JPEG or PNG, up to 1MB"}
          </span>
        </button>
      )}

      {error && (
        <p role="alert" className="text-brand-text mt-2 text-sm">
          {error}
        </p>
      )}

      <input
        ref={input}
        type="file"
        accept="image/webp,image/jpeg,image/png,image/avif,image/gif"
        onChange={(event) => choose(event.target.files?.[0])}
        className="hidden"
      />
    </div>
  );
}

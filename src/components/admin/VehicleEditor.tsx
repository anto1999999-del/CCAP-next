"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BodyEditor from "./BodyEditor";
import PhotoManager from "./PhotoManager";
import { Field, Panel, SeoPanel, StatusPill, inputClass } from "./EditorParts";
import { publishVehicle, removeVehicle, saveVehicle } from "@/app/actions/content";
import {
  toSlug,
  type ContentImage,
  type ContentStatus,
  type SeoFields,
  type Vehicle,
} from "@/lib/content/schema";

/**
 * Adding a car to the gallery.
 *
 * The same two-button save and publish as the blog, for the same reason. What
 * differs is what a vehicle is: a set of photographs first, a write-up second,
 * and the make, model and year that let somebody searching for their own car
 * find it.
 */

type Draft = {
  title: string;
  slug: string;
  make: string;
  model: string;
  year: string;
  body: string;
  photos: ContentImage[];
  seo: Pick<SeoFields, "metaTitle" | "metaDescription" | "noindex">;
};

function draftFrom(vehicle: Vehicle | null): Draft {
  return {
    title: vehicle?.title ?? "",
    slug: vehicle?.slug ?? "",
    make: vehicle?.make ?? "",
    model: vehicle?.model ?? "",
    year: vehicle?.year ?? "",
    body: vehicle?.body ?? "",
    photos: vehicle?.photos ?? [],
    seo: {
      metaTitle: vehicle?.seo.metaTitle ?? "",
      metaDescription: vehicle?.seo.metaDescription ?? "",
      noindex: vehicle?.seo.noindex ?? false,
    },
  };
}

export default function VehicleEditor({ vehicle }: { vehicle: Vehicle | null }) {
  const router = useRouter();
  const [id, setId] = useState<string | null>(vehicle?.id ?? null);
  const [status, setStatus] = useState<ContentStatus>(vehicle?.status ?? "draft");
  const [draft, setDraft] = useState<Draft>(() => draftFrom(vehicle));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();
  const [slugFollowsTitle, setSlugFollowsTitle] = useState(!vehicle);

  const format = vehicle?.bodyFormat ?? "markdown";
  const path = `/gallery/${draft.slug || "..."}`;

  function change(changes: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...changes }));
    setDirty(true);
    setNotice(null);
  }

  function changeTitle(title: string) {
    change(slugFollowsTitle ? { title, slug: toSlug(title) } : { title });
  }

  async function save(): Promise<string | null> {
    const result = await saveVehicle({ id: id ?? undefined, ...draft });

    setErrors(result.errors ?? {});
    setNotice(result.message ?? null);

    if (!result.saved || !result.id) return null;

    setDirty(false);

    if (!id) {
      setId(result.id);
      router.replace(`/manage-gallery/${result.id}`);
    }

    return result.id;
  }

  function saveOnly() {
    start(async () => {
      await save();
      router.refresh();
    });
  }

  function publish(next: boolean) {
    start(async () => {
      const saved = await save();
      if (!saved) return;

      const result = await publishVehicle(saved, next);
      setStatus(next ? "published" : "draft");
      setNotice(result.message ?? null);
      router.refresh();
    });
  }

  function remove() {
    if (!id) return;
    if (!confirm(`Delete "${draft.title}"? This cannot be undone.`)) return;

    start(async () => {
      await removeVehicle(id);
      router.push("/manage-gallery");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="border-line bg-card sticky top-0 z-20 flex flex-wrap items-center gap-3 rounded-2xl border p-4 md:p-5">
        <StatusPill status={status} />

        {dirty ? (
          <span className="text-xs text-amber-400">Unsaved changes</span>
        ) : (
          notice && (
            <span role="status" className="text-xs text-gray-400">
              {notice}
            </span>
          )
        )}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {id && status === "published" && (
            <Link
              href={path}
              target="_blank"
              className="border-line rounded-xl border px-4 py-2 text-sm font-semibold text-gray-300 transition-colors hover:border-white/30 hover:text-white"
            >
              View
            </Link>
          )}

          <button
            type="button"
            onClick={saveOnly}
            disabled={pending}
            className="border-line rounded-xl border px-4 py-2 text-sm font-semibold text-gray-200 transition-colors hover:border-white/30 disabled:opacity-60"
          >
            {pending ? "Working..." : "Save"}
          </button>

          <button
            type="button"
            onClick={() => publish(status !== "published")}
            disabled={pending}
            className="bg-brand hover:bg-brand-hover rounded-xl px-5 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-60"
          >
            {status === "published" ? "Unpublish" : "Publish"}
          </button>
        </div>
      </div>

      {errors.form && (
        <p role="alert" className="text-brand-text text-sm">
          {errors.form}
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <Panel title="The vehicle">
            <Field
              label="Title"
              hint="How the yard writes it, year first."
              error={errors.title}
            >
              <input
                value={draft.title}
                onChange={(event) => changeTitle(event.target.value)}
                placeholder="2019 Kia Cerato 2.0 Sedan"
                className={inputClass}
              />
            </Field>

            <Field
              label="Web address"
              hint={`centralcoastautoparts.com.au${path}`}
              error={errors.slug}
            >
              <input
                value={draft.slug}
                onChange={(event) => {
                  setSlugFollowsTitle(false);
                  change({ slug: toSlug(event.target.value) });
                }}
                placeholder="2019-kia-cerato-sedan"
                className={inputClass}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Make" error={errors.make}>
                <input
                  value={draft.make}
                  onChange={(event) => change({ make: event.target.value })}
                  placeholder="Kia"
                  className={inputClass}
                />
              </Field>
              <Field label="Model" error={errors.model}>
                <input
                  value={draft.model}
                  onChange={(event) => change({ model: event.target.value })}
                  placeholder="Cerato"
                  className={inputClass}
                />
              </Field>
              <Field label="Year" error={errors.year}>
                <input
                  value={draft.year}
                  onChange={(event) => change({ year: event.target.value })}
                  placeholder="2019"
                  inputMode="numeric"
                  className={inputClass}
                />
              </Field>
            </div>
          </Panel>

          <Panel
            title="Photos"
            description="The first photo is the cover, shown on the gallery page and when the link is shared."
          >
            <PhotoManager
              photos={draft.photos}
              onChange={(photos) => change({ photos })}
            />
          </Panel>

          <Panel
            title="Write-up"
            description="Optional. What came off this car, what condition it is in, anything worth knowing."
          >
            <BodyEditor
              value={draft.body}
              format={format}
              onChange={(body) => change({ body })}
            />
          </Panel>
        </div>

        <div className="min-w-0 space-y-6">
          <SeoPanel
            seo={draft.seo}
            fallbackTitle={
              draft.title ? `${draft.title} | Central Coast Auto Parts` : ""
            }
            fallbackDescription={
              draft.title
                ? `Used parts from a ${draft.title} at Central Coast Auto Parts.`
                : ""
            }
            path={path}
            errors={errors}
            onChange={(seo) => change({ seo })}
          />

          {id && (
            <section className="border-line bg-card rounded-2xl border p-5 md:p-6">
              <h2 className="text-sm font-bold tracking-wide text-white uppercase">
                Delete
              </h2>
              <p className="mt-1 mb-4 text-xs text-gray-500">
                Removes the vehicle and its page for good. Unpublishing is
                usually what you want when a car has been stripped.
              </p>
              <button
                type="button"
                onClick={remove}
                disabled={pending}
                className="text-brand-text border-brand/40 hover:bg-brand/10 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60"
              >
                Delete this vehicle
              </button>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

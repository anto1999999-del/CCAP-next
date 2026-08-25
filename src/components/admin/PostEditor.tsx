"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BodyEditor from "./BodyEditor";
import ImagePicker from "./ImagePicker";
import { Field, Panel, SeoPanel, StatusPill, inputClass } from "./EditorParts";
import { publishPost, removePost, savePost } from "@/app/actions/content";
import {
  toSlug,
  type ContentImage,
  type ContentStatus,
  type Post,
  type SeoFields,
} from "@/lib/content/schema";

/**
 * Writing an article.
 *
 * Saving and publishing are two separate buttons on purpose. Save puts the work
 * somewhere safe and changes nothing the public can see; Publish is the moment a
 * page appears on the website, and it should feel like a decision.
 *
 * A new article is saved before it can be published, because publishing needs
 * something to publish and the address has to be checked for collisions first.
 */

type Draft = {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  featuredImage: ContentImage | null;
  tags: string[];
  seo: Pick<SeoFields, "metaTitle" | "metaDescription" | "noindex">;
};

function draftFrom(post: Post | null): Draft {
  return {
    title: post?.title ?? "",
    slug: post?.slug ?? "",
    excerpt: post?.excerpt ?? "",
    body: post?.body ?? "",
    featuredImage: post?.featuredImage ?? null,
    tags: post?.tags ?? [],
    seo: {
      metaTitle: post?.seo.metaTitle ?? "",
      metaDescription: post?.seo.metaDescription ?? "",
      noindex: post?.seo.noindex ?? false,
    },
  };
}

export default function PostEditor({ post }: { post: Post | null }) {
  const router = useRouter();
  const [id, setId] = useState<string | null>(post?.id ?? null);
  const [status, setStatus] = useState<ContentStatus>(post?.status ?? "draft");
  const [draft, setDraft] = useState<Draft>(() => draftFrom(post));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();

  /*
    The address follows the title only until somebody edits it, and never on an
    article that already exists. A published address is what every link and every
    search result points at, so it does not move on its own.
  */
  const [slugFollowsTitle, setSlugFollowsTitle] = useState(!post);

  const format = post?.bodyFormat ?? "markdown";
  const path = `/blog/${draft.slug || "..."}`;

  function change(changes: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...changes }));
    setDirty(true);
    setNotice(null);
  }

  function changeTitle(title: string) {
    change(slugFollowsTitle ? { title, slug: toSlug(title) } : { title });
  }

  /** Returns the saved id, so publishing can follow a first save. */
  async function save(): Promise<string | null> {
    const result = await savePost({ id: id ?? undefined, ...draft });

    setErrors(result.errors ?? {});
    setNotice(result.message ?? null);

    if (!result.saved || !result.id) return null;

    setDirty(false);

    if (!id) {
      setId(result.id);
      // The address becomes /manage-blog/<id>, so a refresh reopens the article
      // rather than presenting a second blank form.
      router.replace(`/manage-blog/${result.id}`);
    }

    return result.id;
  }

  function saveOnly() {
    start(async () => {
      await save();
      router.refresh();
    });
  }

  /*
    Publishing saves first. Otherwise the button publishes the last saved
    version and the writer sees their newest paragraph missing from the live
    page with no indication of why.
  */
  function publish(next: boolean) {
    start(async () => {
      const saved = await save();
      if (!saved) return;

      const result = await publishPost(saved, next);
      setStatus(next ? "published" : "draft");
      setNotice(result.message ?? null);
      router.refresh();
    });
  }

  function remove() {
    if (!id) return;
    if (!confirm(`Delete "${draft.title}"? This cannot be undone.`)) return;

    start(async () => {
      await removePost(id);
      router.push("/manage-blog");
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
          <Panel title="The article">
            <Field label="Title" error={errors.title}>
              <input
                value={draft.title}
                onChange={(event) => changeTitle(event.target.value)}
                placeholder="How to tell a good used gearbox from a bad one"
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
                placeholder="used-gearbox-buying-guide"
                className={inputClass}
              />
            </Field>

            <Field
              label="Summary"
              hint="Shown on the blog index, and used in search results when no search description is set."
              error={errors.excerpt}
            >
              <textarea
                value={draft.excerpt}
                onChange={(event) => change({ excerpt: event.target.value })}
                rows={3}
                className={`${inputClass} resize-y`}
              />
            </Field>
          </Panel>

          <Panel title="Body">
            <BodyEditor
              value={draft.body}
              format={format}
              onChange={(body) => change({ body })}
            />
          </Panel>
        </div>

        <div className="min-w-0 space-y-6">
          <Panel title="Cover image">
            <ImagePicker
              label="Top of the article, and the blog index"
              image={draft.featuredImage}
              onChange={(featuredImage) => change({ featuredImage })}
            />
          </Panel>

          <SeoPanel
            seo={draft.seo}
            fallbackTitle={
              draft.title ? `${draft.title} | Central Coast Auto Parts` : ""
            }
            fallbackDescription={draft.excerpt}
            path={path}
            errors={errors}
            onChange={(seo) => change({ seo })}
          />

          <Panel
            title="Tags"
            description="Separated by commas. Used for grouping, not for search results."
          >
            <input
              value={draft.tags.join(", ")}
              onChange={(event) =>
                change({
                  tags: event.target.value
                    .split(",")
                    .map((tag) => tag.trim())
                    .filter(Boolean),
                })
              }
              placeholder="gearboxes, buying advice"
              className={inputClass}
            />
          </Panel>

          {id && (
            <section className="border-line bg-card rounded-2xl border p-5 md:p-6">
              <h2 className="text-sm font-bold tracking-wide text-white uppercase">
                Delete
              </h2>
              <p className="mt-1 mb-4 text-xs text-gray-500">
                Removes the article and its page for good. Unpublishing is
                usually what you want instead.
              </p>
              <button
                type="button"
                onClick={remove}
                disabled={pending}
                className="text-brand-text border-brand/40 hover:bg-brand/10 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60"
              >
                Delete this article
              </button>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

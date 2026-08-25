"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/accounts";
import {
  createPost,
  createVehicle,
  deletePost,
  deleteVehicle,
  postById,
  postSlugTaken,
  setPostStatus,
  setVehicleStatus,
  updatePost,
  updateVehicle,
  vehicleById,
  vehicleSlugTaken,
} from "@/lib/content/store";
import { EMPTY_SEO, toSlug } from "@/lib/content/schema";

/**
 * Writing the blog and the gallery.
 *
 * Every action checks that the person asking is an admin, on the server, before
 * it does anything. These publish to a public website: a form somebody can
 * submit is a form anybody can submit if the only thing stopping them is a
 * hidden button.
 *
 * Saving and publishing are separate. Saving a draft changes nothing anybody
 * can see; publishing is the deliberate act, and it is the only thing that
 * refreshes the public pages.
 */

export type ContentState = {
  errors?: Record<string, string>;
  message?: string;
  /** The id, so the form can move from "new" to editing after the first save. */
  id?: string;
  saved?: boolean;
};

const ImageSchema = z.object({
  url: z.string().min(1).max(400),
  alt: z.string().trim().max(200).default(""),
  width: z.number().nullable().default(null),
  height: z.number().nullable().default(null),
});

const SeoSchema = z.object({
  metaTitle: z.string().trim().max(120).default(""),
  metaDescription: z.string().trim().max(320).default(""),
  noindex: z.boolean().default(false),
});

const PostSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(3, "Give it a title.").max(160),
  slug: z
    .string()
    .trim()
    .min(3, "The address cannot be empty.")
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and hyphens only."),
  excerpt: z.string().trim().max(400).default(""),
  body: z.string().max(200_000).default(""),
  featuredImage: ImageSchema.nullable().default(null),
  tags: z.array(z.string().trim().max(40)).max(20).default([]),
  seo: SeoSchema,
});

const VehicleSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(3, "Give it a title.").max(160),
  slug: z
    .string()
    .trim()
    .min(3, "The address cannot be empty.")
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and hyphens only."),
  make: z.string().trim().max(40).default(""),
  model: z.string().trim().max(60).default(""),
  year: z.string().trim().max(20).default(""),
  body: z.string().max(200_000).default(""),
  photos: z.array(ImageSchema).max(40).default([]),
  seo: SeoSchema,
});

function firstErrors(error: z.ZodError): Record<string, string> {
  const messages: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path.join(".") || "form";
    messages[field] ??= issue.message;
  }
  return messages;
}

/**
 * Refresh the pages a piece of content appears on.
 *
 * The index, the page itself and the sitemap. The sitemap is split into
 * numbered files by `generateSitemaps`, so it is revalidated by its route
 * pattern rather than by a path: "/sitemap.xml" is the index Next builds from
 * those files and matches no route on its own.
 */
function refreshSitemap() {
  revalidatePath("/sitemap/[__metadata_id__]", "page");
}

function refreshBlog(slug: string) {
  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);
  refreshSitemap();
}

function refreshGallery(slug: string) {
  revalidatePath("/gallery");
  revalidatePath(`/gallery/${slug}`);
  refreshSitemap();
}

/* -------------------------------------------------------------------- posts */

export async function savePost(input: unknown): Promise<ContentState> {
  if (!(await requireAdmin())) {
    return { message: "You are not signed in as an admin." };
  }

  const parsed = PostSchema.safeParse(input);
  if (!parsed.success) return { errors: firstErrors(parsed.error) };

  const { id, slug, seo, ...rest } = parsed.data;

  if (await postSlugTaken(slug, id)) {
    return {
      errors: {
        slug: "Another article already uses that address. Change one of them.",
      },
    };
  }

  if (id) {
    const existing = await postById(id);
    if (!existing) return { message: "That article no longer exists." };

    await updatePost(id, {
      ...rest,
      slug,
      // legacyCanonical is the record of where this lived on WordPress. It is
      // what the redirects are built from and is never edited by hand.
      seo: { ...seo, legacyCanonical: existing.seo.legacyCanonical },
    });

    refreshBlog(slug);
    if (existing.slug !== slug) refreshBlog(existing.slug);

    return { id, saved: true, message: "Saved." };
  }

  const created = await createPost({
    ...rest,
    slug,
    bodyFormat: "markdown",
    // Nothing is published by accident. Publishing is its own button.
    status: "draft",
    publishedAt: null,
    seo: { ...EMPTY_SEO, ...seo },
  });

  return { id: created, saved: true, message: "Draft saved." };
}

export async function publishPost(
  id: string,
  publish: boolean,
): Promise<ContentState> {
  if (!(await requireAdmin())) {
    return { message: "You are not signed in as an admin." };
  }

  const post = await setPostStatus(id, publish ? "published" : "draft");
  if (!post) return { message: "That article no longer exists." };

  refreshBlog(post.slug);

  return {
    id,
    message: publish
      ? "Published. It is on the site now."
      : "Back to draft. It is off the site.",
  };
}

export async function removePost(id: string): Promise<ContentState> {
  if (!(await requireAdmin())) {
    return { message: "You are not signed in as an admin." };
  }

  const post = await postById(id);
  if (!post) return { message: "That article no longer exists." };

  await deletePost(id);
  refreshBlog(post.slug);

  return { message: "Deleted." };
}

/* ----------------------------------------------------------------- vehicles */

export async function saveVehicle(input: unknown): Promise<ContentState> {
  if (!(await requireAdmin())) {
    return { message: "You are not signed in as an admin." };
  }

  const parsed = VehicleSchema.safeParse(input);
  if (!parsed.success) return { errors: firstErrors(parsed.error) };

  const { id, slug, seo, ...rest } = parsed.data;

  if (await vehicleSlugTaken(slug, id)) {
    return {
      errors: {
        slug: "Another vehicle already uses that address. Change one of them.",
      },
    };
  }

  if (id) {
    const existing = await vehicleById(id);
    if (!existing) return { message: "That vehicle no longer exists." };

    await updateVehicle(id, {
      ...rest,
      slug,
      seo: { ...seo, legacyCanonical: existing.seo.legacyCanonical },
    });

    refreshGallery(slug);
    if (existing.slug !== slug) refreshGallery(existing.slug);

    return { id, saved: true, message: "Saved." };
  }

  const created = await createVehicle({
    ...rest,
    slug,
    bodyFormat: "markdown",
    status: "draft",
    publishedAt: null,
    seo: { ...EMPTY_SEO, ...seo },
  });

  return { id: created, saved: true, message: "Draft saved." };
}

export async function publishVehicle(
  id: string,
  publish: boolean,
): Promise<ContentState> {
  if (!(await requireAdmin())) {
    return { message: "You are not signed in as an admin." };
  }

  const vehicle = await setVehicleStatus(id, publish ? "published" : "draft");
  if (!vehicle) return { message: "That vehicle no longer exists." };

  refreshGallery(vehicle.slug);

  return {
    id,
    message: publish
      ? "Published. It is in the gallery now."
      : "Back to draft. It is out of the gallery.",
  };
}

export async function removeVehicle(id: string): Promise<ContentState> {
  if (!(await requireAdmin())) {
    return { message: "You are not signed in as an admin." };
  }

  const vehicle = await vehicleById(id);
  if (!vehicle) return { message: "That vehicle no longer exists." };

  await deleteVehicle(id);
  refreshGallery(vehicle.slug);

  return { message: "Deleted." };
}

/** Suggest an address from a title, for the editor's slug field. */
export async function slugFromTitle(title: string): Promise<string> {
  return toSlug(title);
}

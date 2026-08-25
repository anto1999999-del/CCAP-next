import "server-only";
import { ObjectId, type Collection } from "mongodb";
import { db } from "../db/mongo";
import { EMPTY_SEO, type ContentStatus, type Post, type Vehicle } from "./schema";

/**
 * Where blog posts and gallery vehicles live.
 *
 * They used to be JSON files exported from WordPress, which is fine for reading
 * and impossible to edit from an admin screen. They are rows now, in two
 * collections of their own. Orders and accounts are untouched by any of this.
 *
 * Two collections rather than one with a `kind` column: a post has a body and a
 * vehicle has photographs and a car's identity, and pretending they are the
 * same thing means every query and every form carries fields it does not use.
 *
 * Everything the public sees goes through the `published*` functions, which
 * filter on status. The admin functions do not filter, which is the whole
 * difference between the two sets.
 */

type PostDocument = Omit<Post, "id"> & { _id: ObjectId };
type VehicleDocument = Omit<Vehicle, "id"> & { _id: ObjectId };

async function posts(): Promise<Collection<PostDocument>> {
  return (await db()).collection<PostDocument>("posts");
}

async function vehicles(): Promise<Collection<VehicleDocument>> {
  return (await db()).collection<VehicleDocument>("vehicles");
}

function toPost({ _id, ...rest }: PostDocument): Post {
  return { id: _id.toString(), ...rest, seo: { ...EMPTY_SEO, ...rest.seo } };
}

function toVehicle({ _id, ...rest }: VehicleDocument): Vehicle {
  return {
    id: _id.toString(),
    ...rest,
    photos: rest.photos ?? [],
    seo: { ...EMPTY_SEO, ...rest.seo },
  };
}

/** An id that came from a form, or null if it is not one. */
function asObjectId(id: string): ObjectId | null {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ posts */

export async function publishedPosts(): Promise<Post[]> {
  const documents = await (await posts())
    .find({ status: "published" })
    .sort({ publishedAt: -1 })
    .toArray();

  return documents.map(toPost);
}

export async function publishedPostSlugs(): Promise<string[]> {
  const documents = await (await posts())
    .find({ status: "published" }, { projection: { slug: 1 } })
    .toArray();

  return documents.map((document) => document.slug);
}

/**
 * One post by its slug.
 *
 * `includeDrafts` exists for the admin's preview and for nothing else. A public
 * page must never pass it: a draft is a draft because somebody has not decided
 * it is ready.
 */
export async function postBySlug(
  slug: string,
  { includeDrafts = false } = {},
): Promise<Post | null> {
  const document = await (await posts()).findOne(
    includeDrafts ? { slug } : { slug, status: "published" },
  );

  return document ? toPost(document) : null;
}

export async function postById(id: string): Promise<Post | null> {
  const objectId = asObjectId(id);
  if (!objectId) return null;

  const document = await (await posts()).findOne({ _id: objectId });
  return document ? toPost(document) : null;
}

/** Everything, drafts included, newest first. The admin list. */
export async function allPosts(): Promise<Post[]> {
  const documents = await (await posts())
    .find({})
    .sort({ updatedAt: -1 })
    .toArray();

  return documents.map(toPost);
}

/**
 * Whether a slug is free.
 *
 * Two posts at one address means one of them is unreachable, and which one
 * depends on the order the database happens to return them in.
 */
export async function postSlugTaken(
  slug: string,
  exceptId?: string,
): Promise<boolean> {
  const objectId = exceptId ? asObjectId(exceptId) : null;
  const found = await (await posts()).countDocuments(
    objectId ? { slug, _id: { $ne: objectId } } : { slug },
    { limit: 1 },
  );

  return found > 0;
}

export async function createPost(
  post: Omit<Post, "id" | "updatedAt">,
): Promise<string> {
  const result = await (await posts()).insertOne({
    _id: new ObjectId(),
    ...post,
    updatedAt: new Date().toISOString(),
  } as PostDocument);

  return result.insertedId.toString();
}

export async function updatePost(
  id: string,
  changes: Partial<Omit<Post, "id">>,
): Promise<boolean> {
  const objectId = asObjectId(id);
  if (!objectId) return false;

  const result = await (await posts()).updateOne(
    { _id: objectId },
    { $set: { ...changes, updatedAt: new Date().toISOString() } },
  );

  return result.matchedCount === 1;
}

/**
 * Publish or return to draft.
 *
 * `publishedAt` is set the first time only. Unpublishing and republishing an
 * article should not move it to the top of the blog as though it were new.
 */
export async function setPostStatus(
  id: string,
  status: ContentStatus,
): Promise<Post | null> {
  const post = await postById(id);
  if (!post) return null;

  const publishedAt =
    status === "published" && !post.publishedAt
      ? new Date().toISOString()
      : post.publishedAt;

  await updatePost(id, { status, publishedAt });
  return postById(id);
}

export async function deletePost(id: string): Promise<boolean> {
  const objectId = asObjectId(id);
  if (!objectId) return false;

  const result = await (await posts()).deleteOne({ _id: objectId });
  return result.deletedCount === 1;
}

/* --------------------------------------------------------------- vehicles */

export async function publishedVehicles(): Promise<Vehicle[]> {
  const documents = await (await vehicles())
    .find({ status: "published" })
    .sort({ publishedAt: -1 })
    .toArray();

  return documents.map(toVehicle);
}

export async function publishedVehicleSlugs(): Promise<string[]> {
  const documents = await (await vehicles())
    .find({ status: "published" }, { projection: { slug: 1 } })
    .toArray();

  return documents.map((document) => document.slug);
}

export async function vehicleBySlug(
  slug: string,
  { includeDrafts = false } = {},
): Promise<Vehicle | null> {
  const document = await (await vehicles()).findOne(
    includeDrafts ? { slug } : { slug, status: "published" },
  );

  return document ? toVehicle(document) : null;
}

export async function vehicleById(id: string): Promise<Vehicle | null> {
  const objectId = asObjectId(id);
  if (!objectId) return null;

  const document = await (await vehicles()).findOne({ _id: objectId });
  return document ? toVehicle(document) : null;
}

export async function allVehicles(): Promise<Vehicle[]> {
  const documents = await (await vehicles())
    .find({})
    .sort({ updatedAt: -1 })
    .toArray();

  return documents.map(toVehicle);
}

export async function vehicleSlugTaken(
  slug: string,
  exceptId?: string,
): Promise<boolean> {
  const objectId = exceptId ? asObjectId(exceptId) : null;
  const found = await (await vehicles()).countDocuments(
    objectId ? { slug, _id: { $ne: objectId } } : { slug },
    { limit: 1 },
  );

  return found > 0;
}

export async function createVehicle(
  vehicle: Omit<Vehicle, "id" | "updatedAt">,
): Promise<string> {
  const result = await (await vehicles()).insertOne({
    _id: new ObjectId(),
    ...vehicle,
    updatedAt: new Date().toISOString(),
  } as VehicleDocument);

  return result.insertedId.toString();
}

export async function updateVehicle(
  id: string,
  changes: Partial<Omit<Vehicle, "id">>,
): Promise<boolean> {
  const objectId = asObjectId(id);
  if (!objectId) return false;

  const result = await (await vehicles()).updateOne(
    { _id: objectId },
    { $set: { ...changes, updatedAt: new Date().toISOString() } },
  );

  return result.matchedCount === 1;
}

export async function setVehicleStatus(
  id: string,
  status: ContentStatus,
): Promise<Vehicle | null> {
  const vehicle = await vehicleById(id);
  if (!vehicle) return null;

  const publishedAt =
    status === "published" && !vehicle.publishedAt
      ? new Date().toISOString()
      : vehicle.publishedAt;

  await updateVehicle(id, { status, publishedAt });
  return vehicleById(id);
}

export async function deleteVehicle(id: string): Promise<boolean> {
  const objectId = asObjectId(id);
  if (!objectId) return false;

  const result = await (await vehicles()).deleteOne({ _id: objectId });
  return result.deletedCount === 1;
}

/** What the admin list shows at the top, and the dashboard links to. */
export async function contentCounts(): Promise<{
  posts: { published: number; draft: number };
  vehicles: { published: number; draft: number };
}> {
  const [postCollection, vehicleCollection] = await Promise.all([
    posts(),
    vehicles(),
  ]);

  const [postsPublished, postsDraft, vehiclesPublished, vehiclesDraft] =
    await Promise.all([
      postCollection.countDocuments({ status: "published" }),
      postCollection.countDocuments({ status: "draft" }),
      vehicleCollection.countDocuments({ status: "published" }),
      vehicleCollection.countDocuments({ status: "draft" }),
    ]);

  return {
    posts: { published: postsPublished, draft: postsDraft },
    vehicles: { published: vehiclesPublished, draft: vehiclesDraft },
  };
}

/**
 * The indexes this needs.
 *
 * Called by the importer rather than on every request. A unique index on the
 * slug is what actually stops two pieces of content sharing an address: the
 * check in the form is for a helpful message, the index is for correctness when
 * two people save at the same moment.
 */
export async function ensureIndexes(): Promise<void> {
  const [postCollection, vehicleCollection] = await Promise.all([
    posts(),
    vehicles(),
  ]);

  await Promise.all([
    postCollection.createIndex({ slug: 1 }, { unique: true }),
    postCollection.createIndex({ status: 1, publishedAt: -1 }),
    vehicleCollection.createIndex({ slug: 1 }, { unique: true }),
    vehicleCollection.createIndex({ status: 1, publishedAt: -1 }),
  ]);
}

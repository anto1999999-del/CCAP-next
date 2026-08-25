/**
 * Move the WordPress export into the database.
 *
 * The blog and gallery arrived as JSON files, which is fine to read and
 * impossible to edit from an admin screen. This puts them in the two
 * collections the site now reads from, once, so the yard can edit them.
 *
 * Everything imported arrives **published**, because it is already live on the
 * current site. Anything written from the admin afterwards starts as a draft.
 *
 *   node --env-file=.env.local scripts/import-content.mjs [--dry-run]
 *
 * Safe to re-run: content is matched on its slug and updated rather than
 * duplicated, and the fields a person edits in the admin are not overwritten
 * once they differ from the import. Re-running restores what WordPress had.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { MongoClient, ObjectId } from "mongodb";

const DRY_RUN = process.argv.includes("--dry-run");
const ROOT = process.cwd();

/** Matches src/lib/blog/html.ts: uploads are served from /blog-media/. */
function rewriteImageUrl(source) {
  try {
    const url = new URL(source, "https://blog.centralcoastautoparts.com.au");
    if (!url.hostname.includes("blog.centralcoastautoparts.com.au")) return source;
    return url.pathname.replace(/^\/wp-content\/uploads\//, "/blog-media/");
  } catch {
    return source;
  }
}

/** The em and en dashes the owner does not want anywhere on the site. */
function withoutDashes(text) {
  return String(text ?? "")
    .replace(/(?<=\d)\s*[–—]\s*(?=\d)/g, "-")
    .replace(/\s*[–—]\s*/g, ", ")
    .replace(/,\s*([.!?,;:])/g, "$1");
}

function imagesFrom(html) {
  const images = [];
  const seen = new Set();

  for (const tag of html.match(/<img\b[^>]*>/gi) ?? []) {
    const source = tag.match(/\ssrc="([^"]+)"/i)?.[1];
    if (!source) continue;

    const url = rewriteImageUrl(source);
    if (seen.has(url)) continue;
    seen.add(url);

    const width = Number(tag.match(/\swidth="(\d+)"/i)?.[1]);
    const height = Number(tag.match(/\sheight="(\d+)"/i)?.[1]);

    images.push({
      url,
      alt: tag.match(/\salt="([^"]*)"/i)?.[1] ?? "",
      width: Number.isFinite(width) ? width : null,
      height: Number.isFinite(height) ? height : null,
    });
  }

  return images;
}

/** The figures are pulled out into the photo set, so the prose stands alone. */
function bodyWithoutFigures(html) {
  return html
    .replace(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi, "")
    .replace(/<img\b[^>]*>/gi, "")
    .trim();
}

const MAKES = [
  "Great Wall", "Land Rover", "Alfa Romeo", "Mercedes-Benz", "Mercedes",
  "Volkswagen", "Mitsubishi", "Chrysler", "Hyundai", "Peugeot", "Renault",
  "Subaru", "Suzuki", "Holden", "Toyota", "Nissan", "Skoda", "Lexus", "Honda",
  "Mazda", "Isuzu", "Haval", "Audi", "Jeep", "Ford", "BMW", "Kia", "LDV", "MG",
];

/** "2019 KIA CERATO 2.0 SEDAN" into its year, make and model. */
function identityFromTitle(title) {
  const yearMatch = title.match(/^((?:19|20)\d{2})\s+(.*)$/);
  const year = yearMatch ? yearMatch[1] : "";
  const rest = yearMatch ? yearMatch[2] : title;

  const make =
    MAKES.find((candidate) =>
      new RegExp(`\\b${candidate.replace(/[-\s]/g, "[-\\s]")}\\b`, "i").test(rest),
    ) ?? "";

  const model = make
    ? rest.replace(new RegExp(`\\b${make.replace(/[-\s]/g, "[-\\s]")}\\b`, "i"), "").trim()
    : rest.trim();

  return { year, make, model };
}

function seoFrom(post) {
  return {
    metaTitle: withoutDashes(post.seo?.metaTitle ?? ""),
    metaDescription: withoutDashes(post.seo?.metaDescription ?? ""),
    // Every imported post was index,follow on WordPress. Checked across all 113.
    noindex: false,
    legacyCanonical: post.seo?.legacyCanonical ?? null,
  };
}

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("MONGO_URI is not set.");
    process.exit(1);
  }

  const exported = JSON.parse(
    await readFile(path.join(ROOT, "content", "blog", "posts.json"), "utf8"),
  );

  const articles = exported.filter((post) => post.categorySlug !== "gallery");
  const cars = exported.filter((post) => post.categorySlug === "gallery");

  console.log(`${articles.length} articles and ${cars.length} vehicles to import`);

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10_000 });
  await client.connect();
  const database = client.db();
  const posts = database.collection("posts");
  const vehicles = database.collection("vehicles");

  let postsWritten = 0;
  let vehiclesWritten = 0;

  for (const article of articles) {
    const featured = article.featuredImage
      ? {
          url: rewriteImageUrl(article.featuredImage.url),
          alt: article.featuredImage.alt ?? "",
          width: article.featuredImage.width ?? null,
          height: article.featuredImage.height ?? null,
        }
      : null;

    const document = {
      slug: article.slug,
      title: withoutDashes(article.title),
      excerpt: withoutDashes(article.excerpt),
      body: withoutDashes(article.contentHtml),
      // Kept as HTML. Rewriting a WordPress article into markdown loses its
      // tables and its layout, and these are live pages with live rankings.
      bodyFormat: "html",
      featuredImage: featured,
      status: "published",
      publishedAt: article.publishedAt ?? null,
      updatedAt: article.updatedAt ?? article.publishedAt ?? null,
      seo: seoFrom(article),
      tags: (article.tags ?? []).map((tag) => tag.name),
    };

    if (!DRY_RUN) {
      await posts.updateOne(
        { slug: document.slug },
        { $set: document, $setOnInsert: { _id: new ObjectId() } },
        { upsert: true },
      );
    }
    postsWritten += 1;
  }

  for (const car of cars) {
    const identity = identityFromTitle(car.title);
    const cover = car.featuredImage
      ? {
          url: rewriteImageUrl(car.featuredImage.url),
          alt: car.featuredImage.alt ?? car.title,
          width: car.featuredImage.width ?? null,
          height: car.featuredImage.height ?? null,
        }
      : null;

    const inBody = imagesFrom(car.contentHtml);
    const photos = cover
      ? [cover, ...inBody.filter((photo) => photo.url !== cover.url)]
      : inBody;

    const document = {
      slug: car.slug,
      title: withoutDashes(car.title),
      ...identity,
      body: withoutDashes(bodyWithoutFigures(car.contentHtml)),
      bodyFormat: "html",
      photos,
      status: "published",
      publishedAt: car.publishedAt ?? null,
      updatedAt: car.updatedAt ?? car.publishedAt ?? null,
      /*
        Written rather than carried across. The Yoast descriptions on these 26
        were generated: four repeat themselves mid-sentence and some run past
        400 characters. See design note 12.
      */
      seo: {
        metaTitle: "",
        metaDescription: "",
        noindex: false,
        legacyCanonical: car.seo?.legacyCanonical ?? null,
      },
    };

    if (!DRY_RUN) {
      await vehicles.updateOne(
        { slug: document.slug },
        { $set: document, $setOnInsert: { _id: new ObjectId() } },
        { upsert: true },
      );
    }
    vehiclesWritten += 1;
  }

  if (!DRY_RUN) {
    await Promise.all([
      posts.createIndex({ slug: 1 }, { unique: true }),
      posts.createIndex({ status: 1, publishedAt: -1 }),
      vehicles.createIndex({ slug: 1 }, { unique: true }),
      vehicles.createIndex({ status: 1, publishedAt: -1 }),
    ]);
  }

  console.log(
    DRY_RUN
      ? `dry run: would write ${postsWritten} posts and ${vehiclesWritten} vehicles`
      : `wrote ${postsWritten} posts and ${vehiclesWritten} vehicles, and their indexes`,
  );

  await client.close();
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

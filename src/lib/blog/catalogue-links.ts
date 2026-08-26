import "server-only";
import { loadCatalog } from "../parts/catalog";
import { PART_CATEGORIES } from "../content/part-categories";

/**
 * Turning an article's tags into links to the parts it is about.
 *
 * Eighty-eight articles, several of them thousands of words on the faults of a
 * particular make, and not one link from any of them into the catalogue. A
 * reader who finished four thousand words on what goes wrong with a Kia had no
 * way to reach the Kia parts on the shelf, and neither did a crawler following
 * link equity from the articles that rank to the pages that sell.
 *
 * The tags are matched against the catalogue itself rather than a hand-written
 * map. A tag becomes a link only when it names a make or a model the yard
 * actually holds, so nothing here can point at a filter that returns nothing,
 * and it keeps working as the stock changes without anybody maintaining a list.
 */

/**
 * Words an article uses for a category the site names differently.
 *
 * Matching a tag against the category label alone found almost nothing: the
 * categories are called "Cooling System Parts" and "Electrical Components",
 * and articles talk about radiators, alternators and headlights. Each list here
 * is checked as a substring of the tag, so "alternator problems" reaches the
 * electrical category.
 *
 * Kept deliberately short. Every word is one the yard actually sells under that
 * heading; a wrong guess sends a reader to a page that does not answer them.
 */
const CATEGORY_WORDS: Record<string, readonly string[]> = {
  // Not "motor": a starter motor, a wiper motor and a window motor are all
  // electrical, and engines is checked first, so it swallowed them.
  engines: ["engine", "cylinder", "piston", "turbo", "timingbelt", "timingchain", "headgasket", "dpf", "exhaust", "injector", "sparkplug", "airfilter", "oilfilter"],
  gearboxes: ["gearbox", "transmission", "clutch", "differential", "driveshaft", "cvt", "automatic", "manual"],
  "body-panels": ["panel", "door", "bonnet", "guard", "bumper", "tailgate", "mirror", "windscreen", "bodywork", "smashrepair"],
  electrical: ["electrical", "alternator", "starter", "battery", "ecu", "headlight", "light", "wiring", "sensor", "ignition"],
  suspension: ["suspension", "steering", "strut", "shock", "controlarm", "tierod", "cvjoint", "wheelbearing", "brake"],
  cooling: ["cooling", "radiator", "coolant", "intercooler", "thermostat", "waterpump", "overheat", "aircon", "airconditioning"],
  interior: ["interior", "seat", "dashboard", "trim", "carpet", "seatbelt", "airbag", "console"],
};

export type CatalogueLink = {
  label: string;
  href: string;
};

/** Two words look alike enough to be the same make or model. */
function normalise(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

let indexedFrom: unknown = null;
let makes: Map<string, string> | null = null;
let models: Map<string, { model: string; make: string }> | null = null;

async function catalogueIndex() {
  const { parts } = await loadCatalog();

  // Cached against the catalogue array, like everything else that scans it.
  if (indexedFrom !== parts || !makes || !models) {
    const byMake = new Map<string, string>();
    const byModel = new Map<string, { model: string; make: string }>();

    for (const part of parts) {
      const make = part.manufacturer?.trim();
      const model = part.model?.trim();

      if (make) byMake.set(normalise(make), make);
      if (make && model) byModel.set(normalise(model), { model, make });
    }

    makes = byMake;
    models = byModel;
    indexedFrom = parts;
  }

  return { makes, models };
}

/**
 * Links for one article.
 *
 * Makes first, then models, then any part category the tags name. Capped,
 * because a block of twenty links under an article is a link farm rather than a
 * useful next step.
 */
export async function catalogueLinksForTags(
  tags: readonly string[],
  limit = 6,
  /**
   * Fallback when the tags find nothing.
   *
   * Fourteen of the articles carry no tags at all, and several more tag the car
   * only in the headline. The title is the next best evidence of what an
   * article is about.
   */
  title = "",
): Promise<CatalogueLink[]> {
  const { makes, models } = await catalogueIndex();
  const links: CatalogueLink[] = [];
  const seen = new Set<string>();

  const add = (label: string, href: string) => {
    if (seen.has(href) || links.length >= limit) return;
    seen.add(href);
    links.push({ label, href });
  };

  const linkMake = (make: string) =>
    add(`${make} parts`, `/products?make=${encodeURIComponent(make)}`);

  const linkModel = (make: string, model: string) =>
    add(
      `${make} ${model} parts`,
      `/products?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}`,
    );

  const consider = (phrase: string) => {
    const key = normalise(phrase);
    if (!key) return;

    /*
      Articles are written in the plural and the categories are keyed in the
      singular: "batteries" has to reach "battery", and "panels" to "panel".
    */
    const singular = key.endsWith("ies")
      ? `${key.slice(0, -3)}y`
      : key.endsWith("s")
        ? key.slice(0, -1)
        : key;

    const exactMake = makes.get(key);
    if (exactMake) {
      linkMake(exactMake);
      return;
    }

    const exactModel = models.get(key);
    if (exactModel) {
      linkModel(exactModel.make, exactModel.model);
      return;
    }

    /*
      A tag like "Toyota HiLux" is one string holding both, so a make that
      appears inside it counts, and whatever is left is tried as a model. The
      longest make wins, or "MG" would match inside half the words in English.
    */
    const inside = [...makes.entries()]
      .filter(([normalised]) => normalised.length > 1 && key.includes(normalised))
      .sort((a, b) => b[0].length - a[0].length)[0];

    if (inside) {
      const [normalisedMake, make] = inside;
      const remainder = key.replace(normalisedMake, "");
      const model = remainder ? models.get(remainder) : undefined;

      if (model && model.make === make) linkModel(make, model.model);
      else linkMake(make);
      return;
    }

    /*
      And the category pages, by the words an article would actually use. The
      category is called "Cooling System Parts"; the article says radiator.

      The reverse test, where the slug contains the phrase, needs a length
      floor. Without one the word "in" matched, because "engines" contains it,
      and an article called "Best Car Batteries for Cold Weather in Australia"
      was sent to the engine parts.
    */
    const category = PART_CATEGORIES.find((candidate) => {
      const slug = normalise(candidate.slug);

      return (
        key.includes(slug) ||
        (key.length >= 4 && slug.includes(key)) ||
        key.includes(normalise(candidate.label)) ||
        (CATEGORY_WORDS[candidate.slug] ?? []).some(
          (word) => key.includes(word) || singular.includes(word),
        )
      );
    });
    if (category) {
      add(`Used ${category.label.toLowerCase()}`, `/parts/${category.slug}`);
    }
  };

  for (const tag of tags) consider(tag);

  /*
    Only if the tags produced nothing. An article that named its car in a tag
    has already said what it is about more precisely than its headline can.
  */
  if (links.length === 0 && title) {
    const words = title.split(/[\s,:|]+/);

    /*
      Pairs before single words, because the thing an article is about is
      usually two words: a timing chain, an air filter, a brake pad. Splitting
      the title one word at a time never forms them.
    */
    for (let i = 0; i < words.length - 1; i += 1) {
      consider(`${words[i]} ${words[i + 1]}`);
    }

    for (const word of words) {
      // "in", "for", "the": too short to mean anything, long enough to match
      // something by accident.
      if (normalise(word).length >= 4) consider(word);
    }
  }

  /*
    And never a dead end. An article about buying second-hand parts in general
    names no make and no category, and the one link it should still carry is
    the one to the catalogue.
  */
  if (links.length === 0) {
    add("Browse used car parts", "/products");
  }

  return links;
}

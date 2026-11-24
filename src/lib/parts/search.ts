import { matchesPartType, searchTermMeansPartType } from "./part-type";
import { partTypeLabel, partTypeSearchWords } from "./part-type-names";
import type { CatalogPart } from "./types";

/**
 * Free-text search over the catalogue.
 *
 * Every word typed has to match something about the part, so "2015 hilux
 * bumper" narrows rather than widens. Words that name a whole assembly are
 * matched as part types instead of as text, so "engine" returns engines and not
 * engine covers.
 *
 * Matching forgives how a thing is written, because the catalogue and the
 * customer rarely agree on it. The feed files a Mazda ute as "BT50"; people
 * type "bt-50", and until 5 Oct 2026 that returned nothing while "bt 50" found
 * 671 parts. So punctuation and spacing inside a name are ignored, a plural
 * finds its singular, and the words people use for a part ("headlight",
 * "aircon", "passenger") find the part type the supplier calls something else.
 */

/** Letters and digits only: "BT-50", "bt 50" and "Bt50" all become "bt50". */
function squash(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/** One body of text, in the three forms a typed word is tried against. */
type Text = {
  /** Lower case, as written. */
  text: string;
  /** Each word with its punctuation removed: "cx-5" -> "cx5". */
  words: string;
  /**
   * Each word run together with the one after it, every entry led by a space:
   * "santa fe 2015" -> " santafe fe2015 2015". A search for "santafe" is then
   * a search for " santafe", which can only match from the start of a word.
   * Running everything together instead matched "xtrail" inside "flex
   * trailing arm".
   */
  pairs: string;
};

function asText(text: string): Text {
  const words = text
    .split(/[\s/]+/)
    .map(squash)
    .filter(Boolean);
  return {
    text,
    words: words.join(" "),
    pairs: words.map((word, at) => ` ${word}${words[at + 1] ?? ""}`).join(""),
  };
}

/**
 * What a part type is called: its readable name and the words people use for
 * it. Worked out once per code, not once per part: there are 250 codes and
 * tens of thousands of parts, and a search reads every one of them.
 */
const typeWords = new Map<string, string>();

function wordsForType(code: string): string {
  let words = typeWords.get(code);
  if (words === undefined) {
    words = `${partTypeLabel(code)} ${partTypeSearchWords(code).join(" ")}`;
    typeWords.set(code, words.toLowerCase());
  }
  return typeWords.get(code) ?? "";
}

type Haystack = {
  /** Everything about the part. */
  all: Text;
  /** Just what the part is called, for telling "engine cover" from "engine". */
  name: Text;
};

/**
 * Kept per part for as long as the catalogue holds that part. Building one is
 * the slow half of a search, and the catalogue is the same from one request to
 * the next; when the nightly sync replaces it, these go with the old parts.
 */
const haystacks = new WeakMap<CatalogPart, Haystack>();

function haystack(part: CatalogPart): Haystack {
  const kept = haystacks.get(part);
  if (kept) return kept;

  const code = part.itemTypeCode ?? "";
  const called = [part.itemName, code && wordsForType(code)]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const everything = [
    called,
    part.manufacturer,
    part.model,
    part.year,
    (part.longIcYear ?? []).join(" "),
    code,
    part.stockNo,
    part.icDesc,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const built = { all: asText(everything), name: asText(called) };
  haystacks.set(part, built);
  return built;
}

/**
 * Whether one typed word is found in the part.
 *
 * Tried as written, then without its punctuation against each word, then
 * against each pair of neighbouring words run together -- which is what lets
 * "santafe" find "SANTA FE". That last test is only for words of four letters
 * or more, since a short one would match by accident.
 */
function found(term: string, hay: Text): boolean {
  if (hay.text.includes(term)) return true;

  const bare = squash(term);
  if (!bare) return true; // A stray dash or slash is not a search word.

  return (
    hay.words.includes(bare) ||
    (bare.length >= 4 && hay.pairs.includes(` ${bare}`))
  );
}

/** "mirrors" finds mirrors; "glass" and "abs" are left alone. */
function singular(term: string): string | null {
  return term.length > 3 && term.endsWith("s") && !term.endsWith("ss")
    ? term.slice(0, -1)
    : null;
}

function matchesText(term: string, hay: Text): boolean {
  if (found(term, hay)) return true;
  const one = singular(term);
  return one !== null && found(one, hay);
}

/** The words of a search, lower case, with stray punctuation at their ends removed. */
export function searchTerms(query: string): string[] {
  return (
    query
      .trim()
      .toLowerCase()
      .split(/\s+/)
      // "hilux," and "(bt-50)" are searches for hilux and bt-50.
      .map((term) => term.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, ""))
      .filter(Boolean)
  );
}

export function matchesQuery(part: CatalogPart, query: string): boolean {
  const terms = searchTerms(query);
  if (terms.length === 0) return true;

  const hay = haystack(part);

  return terms.every((term, index) => {
    if (!searchTermMeansPartType(term)) return matchesText(term, hay.all);
    if (matchesPartType(part, term)) return true;

    /*
      "engine" alone means engines, not engine covers. But "engine cover" and
      "wiper motor" are names in their own right, and reading "engine" or
      "motor" as the assembly there found nothing at all. So when another word
      of the search is also part of what this part is called, the words are
      naming the part and are matched as text.
    */
    const namesThisPart = terms.some(
      (other, at) => at !== index && matchesText(other, hay.name),
    );
    return namesThisPart && matchesText(term, hay.all);
  });
}

/** Whether a word of the text starts with the term (or its singular): "rim" is not in "trim". */
function startsAWord(term: string, words: readonly string[]): boolean {
  const bare = squash(term);
  const one = singular(bare);
  return words.some(
    (word) => word.startsWith(bare) || (one !== null && word.startsWith(one)),
  );
}

function wordsOf(text: string): string[] {
  return asText(text.toLowerCase()).words.split(" ").filter(Boolean);
}

/**
 * How well a matching part answers the search, for putting the best first.
 *
 * Every part that reaches here already matches every word, so this only
 * decides order. "carnival door" matched 282 parts and led with window
 * switches, because their part type spells out "door"; a customer typing that
 * wants the doors. So each word scores a point for starting a word of what the
 * part is called, another for starting a word of the supplier's own item name
 * ("Left Front Door", not "Pwr Dr Wind Switch"), and another when it is the
 * last word of that name, which is the thing itself: a "Door Handle" is a
 * handle, a "Left Front Door" is a door.
 */
export function nameScore(part: CatalogPart, terms: readonly string[]): number {
  const called = haystack(part).name.words.split(" ").filter(Boolean);
  const itemName = wordsOf(part.itemName ?? "");
  const last = itemName.slice(-1);
  let score = 0;
  for (const term of terms) {
    if (startsAWord(term, called)) score += 1;
    if (startsAWord(term, itemName)) score += 1;
    if (startsAWord(term, last)) score += 1;
  }
  return score;
}

/** Best answers first; parts that score the same keep the order they came in. */
export function rankByName(
  parts: readonly CatalogPart[],
  query: string,
): CatalogPart[] {
  const terms = searchTerms(query);
  if (terms.length === 0) return [...parts];
  return parts
    .map((part, at) => ({ part, at, score: nameScore(part, terms) }))
    .sort((a, b) => b.score - a.score || a.at - b.at)
    .map(({ part }) => part);
}

/*
  Spelling.

  Customers type "corola", "forrester" and "alternater", and every word of a
  search has to match, so one slip found nothing at all, with no hint why. The
  fix is the one a person behind the counter would make: if a word is not in
  the catalogue anywhere, read it as the catalogue word it is closest to.

  The vocabulary is every word in the catalogue, counted, and it is built once
  per catalogue: the nightly sync replaces the array, and the old vocabulary
  goes with it.
*/

type Vocabulary = { words: string[]; counts: Map<string, number> };

const vocabularies = new WeakMap<readonly CatalogPart[], Vocabulary>();

function vocabulary(catalog: readonly CatalogPart[]): Vocabulary {
  const kept = vocabularies.get(catalog);
  if (kept) return kept;

  const counts = new Map<string, number>();
  for (const part of catalog) {
    for (const word of haystack(part).all.words.split(" ")) {
      if (word) counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }
  const built = { words: [...counts.keys()], counts };
  vocabularies.set(catalog, built);
  return built;
}

/** Edit distance, giving up as soon as it is past `limit`. */
function distance(a: string, b: string, limit: number): number {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  let previous = Array.from({ length: b.length + 1 }, (_, at) => at);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    let best = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + cost,
      );
      best = Math.min(best, current[j]);
    }
    if (best > limit) return limit + 1;
    previous = current;
  }
  return previous[b.length];
}

/**
 * The search with each unknown word replaced by the closest catalogue word, or
 * null when there is nothing to correct.
 *
 * Only words of letters, five or more of them, are touched: numbers are years
 * and stock numbers, and a short word is too easily "corrected" into another
 * real word. A word counts as known when it is part of any catalogue word, so
 * "head" (of "headlamp") is never rewritten. A correction must be a word that
 * appears at least three times, so one typo in a supplier note cannot become
 * the target for everybody else's. The most common of the closest words wins.
 */
export function correctQuery(
  catalog: readonly CatalogPart[],
  query: string,
): string | null {
  const terms = searchTerms(query);
  if (terms.length === 0) return null;

  const { words, counts } = vocabulary(catalog);
  let changed = false;

  const corrected = terms.map((term) => {
    if (!/^[a-z]{5,}$/.test(term)) return term;
    const one = singular(term);
    const known = words.some(
      (word) => word.includes(term) || (one !== null && word.includes(one)),
    );
    if (known) return term;

    const limit = term.length >= 8 ? 2 : 1;
    let best: { word: string; distance: number; count: number } | null = null;
    for (const word of words) {
      const count = counts.get(word) ?? 0;
      if (count < 3 || !/^[a-z]+$/.test(word)) continue;
      const apart = distance(term, word, limit);
      if (apart > limit) continue;
      if (
        !best ||
        apart < best.distance ||
        (apart === best.distance && count > best.count)
      ) {
        best = { word, distance: apart, count };
      }
    }

    if (!best) return term;
    changed = true;
    return best.word;
  });

  return changed ? corrected.join(" ") : null;
}

/**
 * Read a year, make and model out of a typed query.
 *
 * Used to turn a search box entry such as "2022 lexus es" into the same filter
 * state the sidebar would produce, so a search and a filtered browse land on
 * the same results.
 */
export function parseSearchQuery(query: string): {
  year: string;
  make: string;
  model: string;
} {
  const text = query.trim();
  if (!text) return { year: "", make: "", model: "" };

  const year = text.match(/\b(?:19|20)\d{2}\b/)?.[0] ?? "";
  const words = text
    .replace(/\b(?:19|20)\d{2}\b/, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return {
    year,
    make: words[0]?.toUpperCase() ?? "",
    model: words.slice(1).join(" "),
  };
}

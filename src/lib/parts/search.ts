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

export function matchesQuery(part: CatalogPart, query: string): boolean {
  const terms = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    // "hilux," and "(bt-50)" are searches for hilux and bt-50.
    .map((term) => term.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, ""))
    .filter(Boolean);
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

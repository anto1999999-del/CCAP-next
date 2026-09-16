import "server-only";
import { loadCatalog } from "./catalog";

/**
 * Live stock figures for a make, for the /wreckers landing pages.
 *
 * The count is injected at render rather than written into the copy, so a page
 * that says "over 8,000 Hyundai parts" can never drift from what the yard
 * actually holds after a nightly sync. The copy the SEO team wrote deliberately
 * carries no numbers for this reason.
 *
 * "Stock" here is every listable part of that make, price-on-request included,
 * because those are real parts a customer can enquire about, not just the ones
 * with a price online. Withheld whole-vehicle rows are already gone by the time
 * the catalogue is loaded, so they are not counted.
 */

export type MakeStock = {
  /** How many parts of this make are in the catalogue right now. */
  count: number;
  /** The models actually present, most stock first. */
  models: { model: string; count: number }[];
};

/** Case-folded compare, since the catalogue key is upper and slugs are not. */
function isMake(
  manufacturer: string | null | undefined,
  make: string,
): boolean {
  return (manufacturer ?? "").trim().toUpperCase() === make.toUpperCase();
}

export async function makeStock(make: string): Promise<MakeStock> {
  const { parts } = await loadCatalog();

  let count = 0;
  const byModel = new Map<string, number>();

  for (const part of parts) {
    if (!isMake(part.manufacturer, make)) continue;
    count += 1;

    const model = (part.model ?? "").trim();
    if (model) byModel.set(model, (byModel.get(model) ?? 0) + 1);
  }

  const models = [...byModel.entries()]
    .map(([model, n]) => ({ model, count: n }))
    .sort((a, b) => b.count - a.count);

  return { count, models };
}

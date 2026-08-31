import { priceState } from "./price";
import type { CatalogPart } from "./types";

/**
 * The order parts appear in.
 *
 * Two rules, both carried across from the current site because both exist for a
 * reason a customer noticed:
 *
 * 1. Parts with a price come before parts without one. An unpriced row is a
 *    "call us" part; a page full of them looks like a shop with nothing for
 *    sale, so they go last rather than being hidden.
 * 2. Parts are spread across the vehicles they came from. Everything stripped
 *    off one car shares a make, model and date, so in catalogue order a single
 *    Mazda CX-9 fills an entire page. Round-robin across vehicles gives a page
 *    that looks like a yard rather than a car.
 *
 * The result is deterministic, so page two of the same query is always the same
 * page two.
 */

export function hasPrice(part: CatalogPart): boolean {
  return priceState(part.price) === "sellable";
}

function vehicleKey(part: CatalogPart): string {
  return `${(part.manufacturer ?? "").toLowerCase()}|${(part.model ?? "").toLowerCase()}`;
}

/** Round-robin across the vehicles the parts came off. */
function spreadByVehicle(parts: readonly CatalogPart[]): CatalogPart[] {
  const byVehicle = new Map<string, CatalogPart[]>();
  for (const part of parts) {
    const key = vehicleKey(part);
    const group = byVehicle.get(key);
    if (group) group.push(part);
    else byVehicle.set(key, [part]);
  }

  const groups = [...byVehicle.values()];
  const spread: CatalogPart[] = [];
  const deepest = Math.max(0, ...groups.map((group) => group.length));

  for (let index = 0; index < deepest; index += 1) {
    for (const group of groups) {
      if (index < group.length) spread.push(group[index]);
    }
  }

  return spread;
}

/**
 * @param narrowed whether the customer has picked a make or model. When they
 * have, they asked for one vehicle, so spreading across vehicles would only
 * shuffle their results for no reason.
 */
export function arrangeParts(
  parts: readonly CatalogPart[],
  narrowed: boolean,
): CatalogPart[] {
  const priced = parts.filter(hasPrice);
  const unpriced = parts.filter((part) => !hasPrice(part));
  const order = (group: readonly CatalogPart[]) =>
    narrowed ? [...group] : spreadByVehicle(group);

  return [...order(priced), ...order(unpriced)];
}

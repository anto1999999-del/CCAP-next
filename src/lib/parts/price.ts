/**
 * Money.
 *
 * The supplier quotes dollars as a number, which is fine to show and unfit to
 * charge with: 0.1 + 0.2 is not 0.3, and a cart that adds prices in floating
 * point drifts. Anything that will become a charge is converted to whole cents
 * here, on the server, and the browser's number is never taken as the truth.
 */

const AUD = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
});

/** A supplier price in whole cents, or null when there is no real price. */
export function toCents(price: string | number | null): number | null {
  const dollars = Number(price);
  if (!Number.isFinite(dollars) || dollars <= 1) return null;
  return Math.round(dollars * 100);
}

export function formatCents(cents: number): string {
  return AUD.format(cents / 100);
}

/** For display only. Returns an empty string when the part has no price. */
export function formatPrice(price: string | number | null): string {
  const cents = toCents(price);
  return cents === null ? "" : formatCents(cents);
}

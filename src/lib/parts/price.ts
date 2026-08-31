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

/**
 * What the site is allowed to do with a part, decided by its supplier price.
 *
 * The supplier sends three kinds of price and means three different things by
 * them. Measured against the live feed on 28 August 2026, 34,662 parts:
 *
 * - **25,301 priced above a dollar.** A real price. Sellable.
 * - **9,236 at exactly $0.00.** Not "free" -- nobody has entered a price yet. A
 *   quarter of the yard. These are shown, because a customer who can see the
 *   part exists will ask about it, and asking is the whole point of them.
 * - **125 at exactly $1.00.** A whole vehicle, not a part. The supplier lists
 *   complete cars through the same feed and prices them at a dollar; the yard
 *   does not sell them through the website. Withheld.
 *
 * The two are not the same thing and must not be collapsed into "no price",
 * which is what this codebase did until the owner explained the difference on
 * 28 August 2026.
 *
 * Nothing in the feed sits between zero and a dollar, so the boundary is exact
 * rather than a guess. A price that is missing or unreadable is treated as
 * on-request rather than withheld: hiding stock we hold is worse than asking.
 */
export type PriceState =
  /** A real price. Can go in a cart. */
  | "sellable"
  /** Shown, priced on enquiry, never purchasable online. */
  | "on-request"
  /** Kept off the site entirely. */
  | "withheld";

const MINIMUM_REAL_PRICE = 1;

export function priceState(
  price: string | number | null | undefined,
): PriceState {
  const dollars = Number(price);

  // Number(null) is 0 and Number(undefined) is NaN; both mean "no price given".
  if (!Number.isFinite(dollars) || dollars === 0) return "on-request";
  if (dollars <= MINIMUM_REAL_PRICE) return "withheld";
  return "sellable";
}

/**
 * A supplier price in whole cents, or null when there is no real price.
 *
 * Deliberately stricter than it looks: this is what money is computed from, so
 * anything that is not a genuine price returns null and the caller has to
 * decide what to do rather than charging zero.
 */
export function toCents(price: string | number | null): number | null {
  const dollars = Number(price);
  if (!Number.isFinite(dollars) || dollars <= MINIMUM_REAL_PRICE) return null;
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

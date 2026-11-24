import { ObjectId } from "mongodb";

/**
 * Which orders a filter in the back office shows.
 *
 * "Awaiting payment" is the status an order carries from the moment the
 * customer reaches the payment step until Stripe confirms the money. Most of
 * these are abandoned checkouts, and they used to sit in "All" among the paid
 * orders, which is what Harout and Hagop asked to separate (28 Oct 2026). They
 * now have their own filter and appear nowhere else, the totals included.
 *
 * A pure function so the rule can be checked without a database.
 */

export const AWAITING_PAYMENT = "Awaiting payment";

/** Filters with no status of their own. */
const SPECIAL = new Set(["", "Hidden", AWAITING_PAYMENT]);

/** Orders that count as real: visible and paid for (or paid outside Stripe). */
export const PAID_AND_VISIBLE: Record<string, unknown> = {
  hidden: { $ne: true },
  status: { $ne: AWAITING_PAYMENT },
};

export function orderListFilter(
  status: string,
  search: string,
): Record<string, unknown> {
  let filter: Record<string, unknown>;

  if (status === "Hidden") filter = { hidden: true };
  else if (status === AWAITING_PAYMENT)
    filter = { hidden: { $ne: true }, status: AWAITING_PAYMENT };
  else filter = { ...PAID_AND_VISIBLE };

  if (!SPECIAL.has(status)) filter.status = status;

  const term = search.trim();
  if (term) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const like = { $regex: escaped, $options: "i" };
    const matches: unknown[] = [
      { name: like },
      { email: like },
      { phone: like },
      { address: like },
      { city: like },
      { "items.name": like },
      { "items.stockNo": like },
      { "items.manufacturer": like },
      { "items.model": like },
    ];

    // An id is only meaningful whole, so a complete one is matched as well.
    if (/^[a-f\d]{24}$/i.test(term)) matches.push({ _id: new ObjectId(term) });

    filter.$or = matches;
  }

  return filter;
}

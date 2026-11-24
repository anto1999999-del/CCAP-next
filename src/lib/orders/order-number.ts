/**
 * Finding an order by the numbers staff have in hand.
 *
 * Two of them, both asked for at the 28 Oct 2026 meeting ("order id fix",
 * "order id / work order"):
 *
 * - the website's order reference as the emails and the order list show it:
 *   the last six characters of the order id ("42527B"). Searching for it used
 *   to find nothing, because only a whole 24-character id was matched.
 * - Pinnacle Pro's work order number, stored once Pinnacle has imported the
 *   order (see src/lib/supplier/work-orders.ts).
 *
 * A pure function returning Mongo conditions, so the rule can be checked
 * without a database. The conditions are added to the list's other matches.
 */
export function orderNumberMatches(term: string): Record<string, unknown>[] {
  const text = term.trim().replace(/^#/, "");
  const matches: Record<string, unknown>[] = [];

  // The end of an order id: four to 23 hex characters ("42527B", "a9f755").
  if (/^[a-f\d]{4,23}$/i.test(text)) {
    matches.push({
      $expr: {
        $regexMatch: {
          input: { $toString: "$_id" },
          regex: `${text}$`,
          options: "i",
        },
      },
    });
  }

  // A work order number is a whole number, matched exactly.
  if (/^\d{1,12}$/.test(text)) {
    matches.push({ "supplierOrder.proOrderNumber": Number(text) });
  }

  return matches;
}

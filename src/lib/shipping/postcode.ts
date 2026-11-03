/**
 * Which state a postcode is in.
 *
 * The freight carrier wants a state code alongside the suburb and postcode, and
 * asking the customer for something their postcode already determines is a
 * field they can get wrong. Ranges are Australia Post's.
 */

export type AuState = "NSW" | "ACT" | "VIC" | "QLD" | "SA" | "WA" | "TAS" | "NT";

/**
 * ACT and the Northern Territory sit inside NSW's and SA's number ranges, so
 * order matters here: the narrower ranges are tested first.
 */
const RANGES: { from: number; to: number; state: AuState }[] = [
  { from: 800, to: 999, state: "NT" },
  { from: 2600, to: 2618, state: "ACT" },
  { from: 2900, to: 2920, state: "ACT" },
  { from: 1000, to: 1999, state: "NSW" },
  { from: 2000, to: 2599, state: "NSW" },
  { from: 2619, to: 2898, state: "NSW" },
  { from: 2921, to: 2999, state: "NSW" },
  { from: 3000, to: 3999, state: "VIC" },
  { from: 8000, to: 8999, state: "VIC" },
  { from: 4000, to: 4999, state: "QLD" },
  { from: 9000, to: 9999, state: "QLD" },
  { from: 5000, to: 5999, state: "SA" },
  { from: 6000, to: 6999, state: "WA" },
  { from: 7000, to: 7999, state: "TAS" },
];

export function stateFromPostcode(postcode: string | number): AuState | null {
  const digits = String(postcode ?? "")
    .trim()
    .replace(/\D/g, "");
  if (digits.length < 3) return null;

  // Northern Territory postcodes are written with a leading zero.
  const code = digits.length <= 4 ? digits.padStart(4, "0") : digits.slice(0, 4);
  const number = Number(code);
  if (!Number.isFinite(number)) return null;

  return (
    RANGES.find(({ from, to }) => number >= from && number <= to)?.state ?? null
  );
}

/**
 * Postcodes used on both sides of a border, and the other state they are in.
 *
 * The ranges give one state per number, but the carrier checks suburb,
 * postcode and state together. Tharwa ACT 2620 was refused as NSW and priced
 * as ACT (3 November 2026), and the same number covers Queanbeyan, NSW. Only
 * pairs the carrier actually refuses belong here: Barooga 3644, Jennings 4383
 * and Mungindi 2406 also cross a border, and the carrier priced each of them
 * under either state, as it did Wallaroo NSW 2618 sent as ACT.
 */
const ALSO_IN: Partial<Record<string, AuState>> = {
  "2620": "ACT",
};

/**
 * The states to try for a postcode, most likely first.
 *
 * Never empty: an unrecognised postcode is sent as NSW, as it always has been,
 * so the carrier is the one to say it is wrong.
 */
export function statesForPostcode(postcode: string | number): AuState[] {
  const primary = stateFromPostcode(postcode) ?? "NSW";
  const code = String(postcode ?? "").trim();
  const other = ALSO_IN[code];
  return other && other !== primary ? [primary, other] : [primary];
}

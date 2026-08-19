/**
 * A part as identified by the supplier catalogue.
 *
 * `urgId` + `invNumber` together are the only stable identifier Pinnacle gives
 * us; there is no single primary key. Every lookup, cart line and order item is
 * keyed on the pair, so they travel together.
 */
export type PartRef = {
  urgId: string;
  invNumber: string;
};

/** The fields a cart line needs to render and to be priced server-side. */
export type CartLine = PartRef & {
  itemName: string;
  manufacturer?: string;
  model?: string;
  year?: string;
  /** Dollars, as supplied by the catalogue. Never trusted for charging. */
  price: number;
  quantity: number;
  /** Pre-resolved image so the cart does not have to re-derive proxy paths. */
  thumbnail?: string;
};

/** Stable key for a cart line. */
export function lineKey(ref: PartRef): string {
  return `${ref.urgId}::${ref.invNumber}`;
}

export function isSameLine(a: PartRef, b: PartRef): boolean {
  return a.urgId === b.urgId && a.invNumber === b.invNumber;
}

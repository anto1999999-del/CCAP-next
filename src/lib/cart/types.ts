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
  /** The yard's stock number. Absent on carts saved before it was recorded. */
  stockNo?: string;
  /** Dollars, as supplied by the catalogue. Never trusted for charging. */
  price: number;
  /**
   * Always 1. A listing is one physical part off one car, so there is never a
   * second to add, and Pinnacle refuses an order with any other quantity. Kept
   * so a cart saved in a browser still reads and the order keeps its shape.
   */
  quantity: number;
  /** Pre-resolved image so the cart does not have to re-derive proxy paths. */
  thumbnail?: string;
};

/** "2015 TOYOTA COROLLA", in the catalogue's own wording, as parts are titled. */
export function lineVehicle(
  line: Pick<CartLine, "year" | "manufacturer" | "model">,
): string {
  return [line.year, line.manufacturer, line.model].filter(Boolean).join(" ");
}

/** Stable key for a cart line. */
export function lineKey(ref: PartRef): string {
  return `${ref.urgId}::${ref.invNumber}`;
}

export function isSameLine(a: PartRef, b: PartRef): boolean {
  return a.urgId === b.urgId && a.invNumber === b.invNumber;
}

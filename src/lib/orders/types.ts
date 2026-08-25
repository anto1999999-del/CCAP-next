/**
 * The shape of an order, and the statuses it can have.
 *
 * Separate from the repository because the back office renders these in the
 * browser. The repository is server-only, so a client component importing a
 * constant from it drags the database driver towards the browser bundle and the
 * build stops. Types alone would be erased; a value like ORDER_STATUSES is not.
 */

export type OrderStatus =
  | "Pending"
  | "Processing"
  | "Shipped"
  | "Delivered"
  | "Cancelled";

export const ORDER_STATUSES: OrderStatus[] = [
  "Pending",
  "Processing",
  "Shipped",
  "Delivered",
  "Cancelled",
];

/** An order as a page needs it: ids as strings, amount in cents. */
export type Order = {
  id: string;
  userId: string;
  placedAt: string | null;
  status: OrderStatus;
  /** Cents, converted once here so no page multiplies dollars by 100 itself. */
  amountCents: number;
  paymentMethod: string;
  pickup: boolean;
  hidden: boolean;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    zipcode: string;
  };
  items: {
    name: string;
    quantity: number;
    priceCents: number;
    urgId?: string;
    invNumber?: string;
    image?: string;
  }[];
};

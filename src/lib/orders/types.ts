/**
 * The shape of an order, and the statuses it can have.
 *
 * Separate from the repository because the back office renders these in the
 * browser. The repository is server-only, so a client component importing a
 * constant from it drags the database driver towards the browser bundle and the
 * build stops. Types alone would be erased; a value like ORDER_STATUSES is not.
 */

/**
 * Exactly the four the current admin uses, in the order an order moves through
 * them. Renaming one orphans every order already carrying the old word, so
 * these are the supplier of truth rather than something to tidy up.
 */
export const ORDER_STATUSES = [
  "Pending",
  "Processing",
  "On Their Way",
  "Delivered",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Waiting on somebody at the yard, which is what the admin opens to see. */
export const NEEDS_ACTION: OrderStatus[] = ["Pending", "Processing"];

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
    stockNo?: string;
    /** The yard's shelf tag, quoted when a customer rings about an order. */
    tag?: string;
    manufacturer?: string;
    model?: string;
    year?: string;
    itemTypeCode?: string;
    image?: string;
    /** "2018 HYUNDAI I30", shown under the part name in the admin list. */
    vehicle?: string;
  }[];
};

/** The headline the admin reads first. */
export type OrderSummary = {
  todayCount: number;
  todayRevenueCents: number;
  totalCount: number;
  averageOrderCents: number;
  needsAction: number;
  delivered: number;
  revenueCents: number;
  countByStatus: Record<string, number>;
  revenueByStatusCents: Record<string, number>;
  /** Twelve months of revenue, January first, for the year given. */
  monthlyRevenueCents: number[];
  /** The most recent days, oldest first. */
  perDay: { date: string; count: number }[];
};

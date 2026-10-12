import type { Order } from "@/lib/orders/types";
import { site } from "@/lib/site";

/**
 * A paid website order, in the shape the supplier's Order API takes.
 *
 * The yard runs on Pinnacle Pro, Hollander's yard-management system, which is
 * also where the parts catalogue comes from. Its Order API ("REST Order Api
 * V1", Hollander International, 23 Nov 2017, sent to us by Solera on 28 Sep
 * 2026) accepts an order as JSON and queues it for Pinnacle to import. Until
 * now every online sale was typed into Pinnacle by hand from the sales email.
 *
 * Everything here is pure: an order goes in, the document to send comes out,
 * and a reply is read into what happened. No network, no clock, no database,
 * so the rules -- which fields, which limits, what counts as "already sent" --
 * can be checked without touching the yard's live system, which has no test
 * mode.
 *
 * The constraints below are the API's, quoted from that document, not ours.
 */

export type PinnacleOrderType = "QUOTE" | "WORKORDER" | "INVOICE";

export type PinnacleSettings = {
  /**
   * The Pinnacle Pro sales person the order is recorded against. An unknown
   * name is not an error there: Pinnacle files it under "guest".
   */
  salesPerson: string;
  /** Left out of the document when unset, which leaves Pinnacle's default. */
  orderType?: PinnacleOrderType;
  /** The yard's site id, for an item that does not carry its own. */
  defaultUrgId: string;
  /** Stripe's id for the payment, shown in Pinnacle's accounts screen. */
  paymentReference?: string;
};

type Address = {
  name: string;
  address1?: string;
  address2?: string;
  address3?: string;
  city?: string;
  zip?: string;
  phone?: string;
  countryId: string;
  mainContact: string;
  emailAddress: string;
};

type Comment = { commentType: "PUBLIC" | "PRIVATE"; comment: string };

export type PinnacleOrder = {
  externalOrderReference: string;
  orderCreated?: string;
  orderType?: PinnacleOrderType;
  site: { name: string; urgId: string };
  salesPerson: { userName: string };
  customer: {
    referenceType: "BillingAddress";
    reference: string;
    address: Address;
    makeHidden: boolean;
  };
  shipping?: {
    shippingPrice: number;
    priceIncludesTax: boolean;
    shippingAddress: {
      referenceType: "ShippingAddress";
      reference: string;
      address: Address;
      makeHidden: boolean;
    };
    shippingMethod: { shippingMethodDescription: string };
  };
  orderItems: { invNumber: number; price: number; priceIncludesTax: boolean }[];
  payments: {
    paymentMethod: "CREDITCARD";
    paymentAmount: number;
    referenceNumber?: string;
  }[];
  comments: Comment[];
};

/** Why an order cannot be sent as it stands. Somebody enters it by hand. */
export type Unsendable = { ok: false; reason: string };
export type Built = { ok: true; order: PinnacleOrder } | Unsendable;

/** The API's field limits ("Address JSON", page 13). */
const MAX = {
  name: 45,
  line: 40,
  city: 40,
  zip: 10,
  phone: 20,
  contact: 50,
} as const;

const dollars = (cents: number) => Math.round(cents) / 100;

function clip(text: string, length: number): string {
  return text.trim().slice(0, length).trim();
}

/**
 * A street address across the three 40-character lines the API allows.
 *
 * Broken between words, because Pinnacle prints these on the delivery label
 * and "12 Wattle Tree Roa / d" is how a parcel goes missing. Anything past the
 * third line is dropped rather than sent over length and refused.
 */
export function addressLines(address: string): string[] {
  const lines: string[] = [];
  let line = "";

  for (const word of address.trim().split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (next.length <= MAX.line) {
      line = next;
      continue;
    }
    if (line) lines.push(line);
    // A single word longer than a line can only be cut.
    line = word.slice(0, MAX.line);
  }
  if (line) lines.push(line);

  return lines.slice(0, 3);
}

function addressOf(order: Order): Address {
  const { customer } = order;
  const [address1, address2, address3] = addressLines(customer.address);
  const name = customer.name.trim() || "Website customer";

  return {
    name: clip(name, MAX.name),
    ...(address1 ? { address1 } : {}),
    ...(address2 ? { address2 } : {}),
    ...(address3 ? { address3 } : {}),
    ...(customer.city.trim() ? { city: clip(customer.city, MAX.city) } : {}),
    ...(customer.zipcode.trim()
      ? { zip: clip(customer.zipcode, MAX.zip) }
      : {}),
    ...(customer.phone.trim()
      ? { phone: clip(customer.phone, MAX.phone) }
      : {}),
    countryId: "AU",
    // Required whenever an email address is given (error 12).
    mainContact: clip(name, MAX.contact),
    emailAddress: customer.email.trim(),
  };
}

/** What was ordered, before freight. */
function partsCents(order: Order): number {
  return order.items.reduce(
    (total, item) => total + item.priceCents * item.quantity,
    0,
  );
}

export function buildPinnacleOrder(
  order: Order,
  settings: PinnacleSettings,
): Built {
  if (order.items.length === 0) {
    return { ok: false, reason: "the order has no items" };
  }

  const email = order.customer.email.trim();
  if (!email) {
    return { ok: false, reason: "the order has no customer email" };
  }

  const orderItems: PinnacleOrder["orderItems"] = [];
  const sites = new Set<string>();

  for (const item of order.items) {
    const invNumber = Number(item.invNumber);
    if (!item.invNumber || !Number.isInteger(invNumber) || invNumber <= 0) {
      return {
        ok: false,
        reason: `"${item.name}" has no inventory number to identify it in Pinnacle`,
      };
    }
    // The API refuses an item with no price or a zero price (error 15).
    if (item.priceCents <= 0) {
      return { ok: false, reason: `"${item.name}" has no price` };
    }
    /*
      There is no quantity in the API: an inventory number is one physical
      part off one car. Two of the same number cannot both exist.
    */
    if (item.quantity !== 1) {
      return {
        ok: false,
        reason: `"${item.name}" has a quantity of ${item.quantity}; an inventory number is a single part`,
      };
    }

    sites.add(item.urgId?.trim() || settings.defaultUrgId);
    orderItems.push({
      invNumber,
      price: dollars(item.priceCents),
      // What the customer was charged, which is the GST-inclusive price shown.
      priceIncludesTax: true,
    });
  }

  // An order belongs to one site. The yard is one site, so this never trips
  // today; if the feed ever carries a second, the order is split by a person.
  if (sites.size !== 1) {
    return {
      ok: false,
      reason: `the items come from more than one site (${[...sites].join(", ")})`,
    };
  }
  const [urgId] = [...sites];

  const address = addressOf(order);
  const reference = email.toLowerCase();
  const freightCents = Math.max(0, order.amountCents - partsCents(order));
  const shortRef = order.id.slice(-6).toUpperCase();

  const comments: Comment[] = [
    {
      commentType: "PRIVATE",
      comment: `Website order ${shortRef}, paid online by card.`,
    },
  ];

  let shipping: PinnacleOrder["shipping"];

  if (order.pickup) {
    // No shipping block: the API reads that as an order to be collected.
    comments.push({ commentType: "PUBLIC", comment: "Customer will collect." });
  } else if (freightCents > 0) {
    shipping = {
      shippingPrice: dollars(freightCents),
      priceIncludesTax: true,
      shippingAddress: {
        referenceType: "ShippingAddress",
        reference,
        address,
        makeHidden: false,
      },
      shippingMethod: { shippingMethodDescription: "Team Global Express" },
    };
  } else {
    /*
      A delivery with no freight charge. The API refuses a shipping price that
      is not above zero (error 30), so the block cannot be sent; the address
      goes in a comment instead, or the yard would read this as a pickup.
    */
    comments.push({
      commentType: "PUBLIC",
      comment: `Deliver to: ${[order.customer.address, order.customer.city, order.customer.zipcode].filter(Boolean).join(", ")}. No freight charged.`,
    });
  }

  return {
    ok: true,
    order: {
      /*
        The full order id, not the six characters people quote. The API holds
        this unique per site and refuses a second order with the same one
        (error 9), which is what makes sending safe to retry.
      */
      externalOrderReference: order.id,
      ...(order.placedAt ? { orderCreated: order.placedAt } : {}),
      ...(settings.orderType ? { orderType: settings.orderType } : {}),
      site: { name: site.name, urgId },
      salesPerson: { userName: settings.salesPerson },
      customer: {
        referenceType: "BillingAddress",
        // How Pinnacle finds this customer again; a new one is made otherwise.
        reference,
        address,
        makeHidden: false,
      },
      ...(shipping ? { shipping } : {}),
      orderItems,
      payments: [
        {
          paymentMethod: "CREDITCARD",
          paymentAmount: dollars(order.amountCents),
          ...(settings.paymentReference
            ? { referenceNumber: settings.paymentReference }
            : {}),
        },
      ],
      comments,
    },
  };
}

/**
 * What the API said, in the three ways that matter.
 *
 * - accepted: the order is queued in Pinnacle.
 * - refused: the API read the order and will not take it. Sending it again
 *   gets the same answer, so a person has to deal with it.
 * - unclear: no usable answer. It may or may not have arrived, so it is tried
 *   again; the duplicate check makes that safe.
 */
export type PinnacleOutcome =
  | { kind: "accepted"; message: string }
  | { kind: "refused"; code: number | null; message: string }
  | { kind: "unclear"; message: string };

/** Error 9: this reference is already there. The earlier send got through. */
const DUPLICATE_REFERENCE = 9;
/** Error 0: "We encountered a problem", their name for an unreported fault. */
const SYSTEM_FAULT = 0;

/**
 * Read a reply body. The HTTP status is not passed in on purpose: this API
 * answers 500 for an ordinary "No Order was found!", so the status says
 * nothing the body does not say better.
 */
export function readPinnacleReply(body: string): PinnacleOutcome {
  let reply: unknown;
  try {
    reply = JSON.parse(body);
  } catch {
    return {
      kind: "unclear",
      message: `not a JSON reply: ${body.trim().slice(0, 120) || "(empty)"}`,
    };
  }

  if (typeof reply !== "object" || reply === null || !("error" in reply)) {
    return { kind: "unclear", message: "reply had no error flag" };
  }

  const { error, msg } = reply as { error: unknown; msg?: unknown };
  const message = typeof msg === "string" ? msg.trim() : "";

  if (error === false) return { kind: "accepted", message };

  // "9: Duplicate external order reference for site"
  const code = /^(\d+)\s*:/.exec(message);
  const number = code ? Number(code[1]) : null;

  if (number === DUPLICATE_REFERENCE) {
    return {
      kind: "accepted",
      message: "already received (duplicate reference)",
    };
  }
  // No message at all, or their catch-all fault: nothing was decided about
  // the order itself, so it is worth another attempt.
  if (!message || number === SYSTEM_FAULT) {
    return { kind: "unclear", message: message || "error with no message" };
  }

  return { kind: "refused", code: number, message };
}

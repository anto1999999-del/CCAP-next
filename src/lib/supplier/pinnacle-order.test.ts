import { describe, expect, it } from "vitest";
import type { Order } from "@/lib/orders/types";
import {
  addressLines,
  buildPinnacleOrder,
  readPinnacleReply,
  type PinnacleSettings,
} from "./pinnacle-order";

/**
 * What the yard's system is sent for a paid order, and how its answers are
 * read. There is no test mode on the supplier's side: an order that is
 * accepted is a real order in Pinnacle. So the document is checked here,
 * field by field against their specification, before anything is sent.
 */

const settings: PinnacleSettings = {
  salesPerson: "WEBSITE",
  defaultUrgId: "nw42",
  paymentReference: "pi_test_123",
};

function order(overrides: Partial<Order> = {}): Order {
  return {
    id: "66c2f1a4e1b2c3d4e5108899",
    userId: "u1",
    placedAt: "2026-09-23T22:05:56.492Z",
    status: "Pending",
    amountCents: 10921,
    paymentMethod: "Stripe",
    pickup: false,
    hidden: false,
    customer: {
      name: "Stewart McKeown",
      email: "Stewart@Example.com",
      phone: "0412 345 678",
      address: "10 Example Street",
      city: "Umina Beach",
      zipcode: "2257",
    },
    items: [
      {
        name: "Starter",
        quantity: 1,
        priceCents: 8500,
        urgId: "nw42",
        invNumber: "88880",
      },
    ],
    ...overrides,
  };
}

function built(
  overrides: Partial<Order> = {},
  extra: Partial<PinnacleSettings> = {},
) {
  const result = buildPinnacleOrder(order(overrides), {
    ...settings,
    ...extra,
  });
  if (!result.ok)
    throw new Error(`expected a sendable order: ${result.reason}`);
  return result.order;
}

const commentsOf = (doc: ReturnType<typeof built>) =>
  doc.comments.map((c) => c.comment).join(" ");

describe("the order document", () => {
  it("identifies the order by its full id, so a resend is recognised", () => {
    expect(built().externalOrderReference).toBe("66c2f1a4e1b2c3d4e5108899");
  });

  it("names the site, the sales person and when it was placed", () => {
    const doc = built();
    expect(doc.site.urgId).toBe("nw42");
    expect(doc.salesPerson).toEqual({ userName: "WEBSITE" });
    expect(doc.orderCreated).toBe("2026-09-23T22:05:56.492Z");
  });

  it("sends each part by inventory number, as a number, at the price charged", () => {
    expect(built().orderItems).toEqual([
      { invNumber: 88880, price: 85, priceIncludesTax: true },
    ]);
  });

  it("splits what was paid into parts and freight that add up", () => {
    const doc = built();
    expect(doc.shipping?.shippingPrice).toBe(24.21);
    expect(doc.payments).toEqual([
      {
        paymentMethod: "CREDITCARD",
        paymentAmount: 109.21,
        referenceNumber: "pi_test_123",
      },
    ]);
    expect(
      doc.orderItems[0].price + (doc.shipping?.shippingPrice ?? 0),
    ).toBeCloseTo(109.21);
  });

  it("gives the customer the fields the API requires", () => {
    const { customer } = built();
    expect(customer.referenceType).toBe("BillingAddress");
    // Lower case, so the same person is one customer in Pinnacle either way.
    expect(customer.reference).toBe("stewart@example.com");
    expect(customer.address).toMatchObject({
      name: "Stewart McKeown",
      address1: "10 Example Street",
      city: "Umina Beach",
      zip: "2257",
      countryId: "AU",
      mainContact: "Stewart McKeown",
      emailAddress: "Stewart@Example.com",
    });
  });

  it("ships to the customer with the reference types the API insists on", () => {
    const { shipping } = built();
    expect(shipping?.shippingAddress.referenceType).toBe("ShippingAddress");
    expect(shipping?.shippingAddress.makeHidden).toBe(false);
    expect(shipping?.shippingMethod.shippingMethodDescription).toBeTruthy();
    expect(shipping?.priceIncludesTax).toBe(true);
  });

  it("leaves shipping out for a pickup, which the API reads as a collection", () => {
    const doc = built({ pickup: true, amountCents: 8500 });
    expect(doc.shipping).toBeUndefined();
    expect(commentsOf(doc)).toContain("collect");
  });

  it("does not send a zero shipping price, which the API refuses", () => {
    const doc = built({ amountCents: 8500 });
    expect(doc.shipping).toBeUndefined();
    // ...but the yard must still see it is a delivery, not a pickup.
    expect(commentsOf(doc)).toContain("Deliver to: 10 Example Street");
  });

  it("sends only fields the live API accepts", () => {
    // The API's own list, from its refusal of the first real order (24 Oct
    // 2026). Anything else, such as orderType, gets the whole order refused.
    const known = [
      "salesPerson",
      "claimNumber",
      "site",
      "externalOrderReference",
      "repairOrderNumber",
      "payments",
      "shipping",
      "orderItems",
      "comments",
      "taxExemptOverride",
      "orderCreated",
      "customerPO",
      "customer",
      "charges",
    ];
    for (const doc of [built(), built({ pickup: true, amountCents: 8500 })]) {
      for (const field of Object.keys(doc)) expect(known).toContain(field);
    }
  });

  it("keeps every address field inside the API's limits", () => {
    const { address } = built({
      customer: {
        name: "A".repeat(80),
        email: "a@example.com",
        phone: "1".repeat(40),
        address:
          "Unit 14 Building C The Very Long Named Industrial Estate 1234 Pacific Highway North",
        city: "C".repeat(60),
        zipcode: "2".repeat(20),
      },
    }).customer;

    expect(address.name.length).toBeLessThanOrEqual(45);
    expect(address.mainContact.length).toBeLessThanOrEqual(50);
    expect(address.phone?.length).toBeLessThanOrEqual(20);
    expect(address.city?.length).toBeLessThanOrEqual(40);
    expect(address.zip?.length).toBeLessThanOrEqual(10);
    for (const line of [address.address1, address.address2, address.address3]) {
      expect((line ?? "").length).toBeLessThanOrEqual(40);
    }
  });
});

describe("address lines", () => {
  it("breaks a long address between words", () => {
    expect(
      addressLines(
        "Unit 14 Building C The Very Long Named Industrial Estate 1234 Pacific Highway",
      ),
    ).toEqual([
      "Unit 14 Building C The Very Long Named",
      "Industrial Estate 1234 Pacific Highway",
    ]);
  });

  it("leaves a short address on one line", () => {
    expect(addressLines("  10 Example Street ")).toEqual(["10 Example Street"]);
  });
});

describe("orders that cannot be sent", () => {
  const reason = (overrides: Partial<Order>) => {
    const result = buildPinnacleOrder(order(overrides), settings);
    return result.ok ? null : result.reason;
  };
  const item = order().items[0];

  it("refuses a part with no inventory number", () => {
    expect(reason({ items: [{ ...item, invNumber: undefined }] })).toContain(
      "inventory number",
    );
    expect(reason({ items: [{ ...item, invNumber: "ABC" }] })).toContain(
      "inventory number",
    );
  });

  it("refuses a part with no price, which the API would reject", () => {
    expect(reason({ items: [{ ...item, priceCents: 0 }] })).toContain(
      "no price",
    );
  });

  it("refuses a quantity above one, since an inventory number is one part", () => {
    expect(reason({ items: [{ ...item, quantity: 2 }] })).toContain("quantity");
  });

  it("refuses items from two sites", () => {
    expect(
      reason({ items: [item, { ...item, invNumber: "88881", urgId: "zz99" }] }),
    ).toContain("more than one site");
  });

  it("refuses an order with no items or no email", () => {
    expect(reason({ items: [] })).toContain("no items");
    expect(reason({ customer: { ...order().customer, email: " " } })).toContain(
      "email",
    );
  });
});

describe("reading the API's reply", () => {
  it("takes error:false as accepted", () => {
    expect(
      readPinnacleReply(
        '{"msg":"Success. External Order Reference: 000123-2","error":false}',
      ),
    ).toEqual({
      kind: "accepted",
      message: "Success. External Order Reference: 000123-2",
    });
  });

  it("treats a duplicate reference as already received, not as a failure", () => {
    expect(
      readPinnacleReply(
        '{"msg":"9: Duplicate external order reference for site","error":true}',
      ).kind,
    ).toBe("accepted");
  });

  it("reports a refusal with its code, so it is not sent again", () => {
    expect(
      readPinnacleReply(
        '{"msg":"15: No price supplied for inventory item","error":true}',
      ),
    ).toEqual({
      kind: "refused",
      code: 15,
      message: "15: No price supplied for inventory item",
    });
  });

  it("keeps a refusal that has no code", () => {
    expect(
      readPinnacleReply(
        '{"msg":"Permission Denied! Please contact Hollander International Support.","error":true}',
      ),
    ).toMatchObject({ kind: "refused", code: null });
  });

  it("calls an error with no message unclear, as the empty probe got", () => {
    expect(readPinnacleReply('{"msg":null,"error":true}').kind).toBe("unclear");
    expect(
      readPinnacleReply('{"msg":"0: We encountered a problem","error":true}')
        .kind,
    ).toBe("unclear");
  });

  it("calls anything that is not their JSON unclear", () => {
    expect(readPinnacleReply("<html>Bad Gateway</html>").kind).toBe("unclear");
    expect(readPinnacleReply("").kind).toBe("unclear");
    expect(readPinnacleReply("[]").kind).toBe("unclear");
  });
});

import { describe, expect, it } from "vitest";
import type { Order, OrderStatus } from "@/lib/orders/types";
import {
  orderConfirmation,
  orderForSales,
  orderStatusUpdate,
  reference,
} from "./orders";

/**
 * These templates are the only thing a customer sees after they pay, and they
 * are sent from a webhook nobody watches. Getting a total wrong here is not a
 * cosmetic bug: it is a receipt that disagrees with the card statement.
 *
 * So what is checked is the arithmetic and the escaping, not the markup.
 */

function order(overrides: Partial<Order> = {}): Order {
  return {
    id: "66c2f1a4e1b2c3d4e54cf96e",
    userId: "u1",
    placedAt: "2026-08-27T23:30:00.000Z",
    status: "Pending",
    amountCents: 53908,
    paymentMethod: "card",
    pickup: false,
    hidden: false,
    customer: {
      name: "Jane Smith",
      email: "jane@example.com",
      phone: "0412 345 678",
      address: "10 Example Street",
      city: "Newcastle",
      zipcode: "2300",
    },
    items: [
      {
        name: "Gearbox",
        quantity: 1,
        priceCents: 50000,
        tag: "A12",
        vehicle: "2018 HYUNDAI I30",
      },
    ],
    ...overrides,
  };
}

describe("order reference", () => {
  it("is the last six of the id, which is what the admin list shows", () => {
    expect(reference(order())).toBe("4CF96E");
  });
});

describe("order confirmation", () => {
  it("bills parts, freight and total so the three reconcile", () => {
    const { html } = orderConfirmation(order());

    expect(html).toContain("$500.00"); // parts
    expect(html).toContain("$39.08"); // freight, the remainder
    expect(html).toContain("$539.08"); // total paid
  });

  it("charges nothing for freight on a pickup order", () => {
    const { text } = orderConfirmation(
      order({ pickup: true, amountCents: 50000 }),
    );

    expect(text).toContain("Pickup: No charge");
    expect(text).toContain("Total paid: $500.00");
  });

  it("never reports negative freight when a total predates the charge", () => {
    // An older order whose stored total is less than its own line items.
    const { text } = orderConfirmation(order({ amountCents: 40000 }));

    expect(text).toContain("Delivery: No charge");
    expect(text).not.toMatch(/-\$/);
  });

  it("dates the order in Australian time, not the server's UTC", () => {
    // 23:30 UTC on the 27th is already the 28th in Sydney.
    expect(orderConfirmation(order()).text).toContain("28 August 2026");
  });

  it("tells a pickup customer to wait for the call", () => {
    const { text } = orderConfirmation(order({ pickup: true }));

    expect(text).toContain("wait for that call");
    expect(text).toContain("0412 345 678");
  });

  it("escapes anything that came off a form or a supplier feed", () => {
    const { html } = orderConfirmation(
      order({
        customer: { ...order().customer, name: '<script>alert("x")</script>' },
      }),
    );

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("always carries both a text and an HTML part", () => {
    const message = orderConfirmation(order());

    expect(message.text.length).toBeGreaterThan(0);
    expect(message.html).toContain("<!doctype html>");
    expect(message.subject).toBe("Order 4CF96E confirmed");
  });
});

describe("status updates", () => {
  const subjectFor = (status: OrderStatus, pickup = false) =>
    orderStatusUpdate(order({ status, pickup })).subject;

  it("gives every status its own subject", () => {
    const subjects = [
      subjectFor("Pending"),
      subjectFor("Processing"),
      subjectFor("On Their Way"),
      subjectFor("Delivered"),
    ];

    expect(new Set(subjects).size).toBe(4);
    for (const subject of subjects) expect(subject).toContain("4CF96E");
  });

  it("does not tell somebody collecting that their parts are travelling", () => {
    expect(subjectFor("On Their Way", true)).toBe(
      "Order 4CF96E is ready to collect",
    );
    expect(subjectFor("Delivered", true)).toBe("Order 4CF96E collected");
  });

  it("shows the yard address to collect from, not the customer's", () => {
    const { text } = orderStatusUpdate(
      order({ status: "On Their Way", pickup: true }),
    );

    expect(text).toContain("Berkeley Vale");
    expect(text).not.toContain("10 Example Street");
  });
});

describe("the copy that goes to the yard", () => {
  it("leads with the money and carries the full id for lookup", () => {
    const message = orderForSales(order());

    expect(message.subject).toBe("New order, $539.08, Jane Smith");
    expect(message.text).toContain("66c2f1a4e1b2c3d4e54cf96e");
    expect(message.text).toContain("tag A12");
  });
});

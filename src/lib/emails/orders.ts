import type { Order } from "@/lib/orders/types";
import { formatCents } from "@/lib/parts/price";
import { site } from "@/lib/site";
import { COLOURS, auDate, emailShell, esc, opening } from "./shell";

/**
 * The emails an order sends: one when it is paid, one whenever the yard moves
 * it along, and one to sales so somebody knows to go and pick the parts.
 *
 * Each returns a subject, an HTML part and a plain-text part. Both parts are
 * always built. Text is not a fallback nobody sees: some clients are configured
 * to show it, screen readers prefer it, and a message with no text part scores
 * worse with spam filters — which for a confirmation email means the customer
 * never learns their money arrived.
 *
 * Nothing here promises a delivery window or a warranty term. Those are the
 * owner's to state, and an email that guesses at them creates an obligation the
 * business never agreed to.
 */

const { BRAND, INK, MUTED, LINE } = COLOURS;

export type Message = { subject: string; html: string; text: string };

/**
 * The short reference a customer quotes on the phone.
 *
 * The last six characters of the order id, which is what the admin's order list
 * shows, so both ends of a phone call are reading the same thing.
 */
export function reference(order: Order): string {
  return order.id.slice(-6).toUpperCase();
}

function firstName(order: Order): string {
  return order.customer.name.trim().split(/\s+/)[0] || "there";
}

/** What was ordered, before freight. */
function partsCents(order: Order): number {
  return order.items.reduce(
    (total, item) => total + item.priceCents * item.quantity,
    0,
  );
}

/**
 * Freight, worked back out of the total.
 *
 * Orders do not store the delivery charge separately: the documents are the
 * ones the current site created and it only ever recorded a total. The
 * subtraction is exact because both halves were computed in cents on the
 * server, and it is clamped in case an older order predates the charge.
 */
function deliveryCents(order: Order): number {
  return Math.max(0, order.amountCents - partsCents(order));
}

function whereItIsGoing(order: Order): string {
  return order.pickup
    ? site.address.displayLine
    : [
        order.customer.address,
        `${order.customer.city} ${order.customer.zipcode}`.trim(),
      ]
        .filter(Boolean)
        .join(", ");
}

// ---------------------------------------------------------------- HTML pieces

function itemsTable(order: Order): string {
  const rows = order.items
    .map((item) => {
      const detail = [item.vehicle, item.tag && `Tag ${item.tag}`]
        .filter((part): part is string => Boolean(part))
        .map(esc)
        .join(" &middot; ");

      return `        <tr>
          <td style="padding:11px 0;border-bottom:1px solid ${LINE};font-size:14px;line-height:20px;color:${INK};">
            ${esc(item.name)}${detail ? `<br><span style="font-size:12px;color:${MUTED};">${detail}</span>` : ""}
          </td>
          <td style="padding:11px 8px;border-bottom:1px solid ${LINE};font-size:14px;color:${MUTED};text-align:center;white-space:nowrap;">&times;${item.quantity}</td>
          <td style="padding:11px 0;border-bottom:1px solid ${LINE};font-size:14px;color:${INK};text-align:right;white-space:nowrap;">${formatCents(item.priceCents * item.quantity)}</td>
        </tr>`;
    })
    .join("\n");

  const freight = deliveryCents(order);
  const freightLabel =
    order.pickup || freight === 0 ? "No charge" : formatCents(freight);

  return `      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;margin:0 0 24px 0;">
${rows}
        <tr>
          <td colspan="2" style="padding:12px 0 2px 0;font-size:14px;color:${MUTED};">Parts</td>
          <td style="padding:12px 0 2px 0;font-size:14px;color:${INK};text-align:right;white-space:nowrap;">${formatCents(partsCents(order))}</td>
        </tr>
        <tr>
          <td colspan="2" style="padding:2px 0 10px 0;font-size:14px;color:${MUTED};">${order.pickup ? "Pickup" : "Delivery"}</td>
          <td style="padding:2px 0 10px 0;font-size:14px;color:${INK};text-align:right;white-space:nowrap;">${freightLabel}</td>
        </tr>
        <tr>
          <td colspan="2" style="padding:10px 0 0 0;border-top:2px solid ${INK};font-size:15px;font-weight:bold;color:${INK};">Total paid</td>
          <td style="padding:10px 0 0 0;border-top:2px solid ${INK};font-size:17px;font-weight:bold;color:${INK};text-align:right;white-space:nowrap;">${formatCents(order.amountCents)}</td>
        </tr>
      </table>`;
}

/** The panel carrying the reference, the date and where the parts are going. */
function summaryPanel(order: Order): string {
  const rows: [string, string][] = [["Order reference", reference(order)]];

  if (order.placedAt) rows.push(["Placed", auDate(order.placedAt)]);
  rows.push([
    order.pickup ? "Collect from" : "Delivering to",
    whereItIsGoing(order),
  ]);

  const cells = rows
    .map(
      ([label, value]) =>
        `          <div style="font-size:11px;line-height:17px;color:${MUTED};text-transform:uppercase;letter-spacing:.6px;">${esc(label)}</div>
          <div style="font-size:15px;line-height:22px;color:${INK};font-weight:bold;padding-bottom:10px;">${esc(value)}</div>`,
    )
    .join("\n");

  return `      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;background:#f7f8fa;border:1px solid ${LINE};border-radius:10px;margin:0 0 24px 0;">
        <tr><td style="padding:16px 18px 6px 18px;">
${cells}
        </td></tr>
      </table>`;
}

function callUs(): string {
  return `      <p style="margin:0 0 26px 0;font-size:14px;line-height:22px;color:${MUTED};">
        Questions about this order? Call <a href="tel:${esc(site.contact.phoneE164)}" style="color:${BRAND};font-weight:bold;text-decoration:none;">${esc(site.contact.phone)}</a> and quote your order reference.
      </p>`;
}

function heading(text: string): string {
  return `      <h2 style="margin:0 0 8px 0;font-size:16px;line-height:22px;color:${INK};">${text}</h2>`;
}

// ------------------------------------------------------------- the confirmation

/** Sent once Stripe confirms the payment, never before. */
export function orderConfirmation(order: Order): Message {
  const ref = reference(order);
  const total = formatCents(order.amountCents);

  const next = order.pickup
    ? `Your parts are being put aside at ${site.address.displayLine}. We will call you on ${esc(order.customer.phone)} once they are ready to collect &mdash; please wait for that call before making the trip.`
    : "Your parts are being picked and packed now. We will email you again as soon as they leave our yard.";

  const html = emailShell({
    preheader: `We have your payment of ${total}. Order reference ${ref}.`,
    body: [
      opening(
        `Thanks ${esc(firstName(order))}, your order is confirmed`,
        `We have received your payment of <strong style="color:${INK};">${total}</strong>. Here is everything on the order.`,
      ),
      summaryPanel(order),
      itemsTable(order),
      heading("What happens next"),
      `      <p style="margin:0 0 24px 0;font-size:14px;line-height:22px;color:${MUTED};">${next}</p>`,
      callUs(),
    ].join("\n"),
  });

  const text = [
    `Thanks ${firstName(order)}, your order is confirmed.`,
    "",
    `We have received your payment of ${total}.`,
    "",
    `Order reference: ${ref}`,
    ...(order.placedAt ? [`Placed: ${auDate(order.placedAt)}`] : []),
    `${order.pickup ? "Collect from" : "Delivering to"}: ${whereItIsGoing(order)}`,
    "",
    ...order.items.map(
      (item) =>
        `  ${item.quantity} x ${item.name} - ${formatCents(item.priceCents * item.quantity)}`,
    ),
    "",
    `  Parts: ${formatCents(partsCents(order))}`,
    `  ${order.pickup ? "Pickup" : "Delivery"}: ${order.pickup || deliveryCents(order) === 0 ? "No charge" : formatCents(deliveryCents(order))}`,
    `  Total paid: ${total}`,
    "",
    order.pickup
      ? `Your parts are being put aside at ${site.address.displayLine}. We will call you on ${order.customer.phone} once they are ready to collect. Please wait for that call before making the trip.`
      : "Your parts are being picked and packed now. We will email you again as soon as they leave our yard.",
    "",
    `Questions? Call ${site.contact.phone} and quote reference ${ref}.`,
    "",
    site.name,
    site.address.displayLine,
  ].join("\n");

  return { subject: `Order ${ref} confirmed`, html, text };
}

// ------------------------------------------------------------ the status email

/**
 * What each status means to the person waiting for the parts.
 *
 * Pickup and delivery orders get different words for the same status. "On their
 * way" to somebody who chose to collect is simply wrong: their parts are not
 * going anywhere, they are ready.
 */
function statusCopy(order: Order): {
  subject: string;
  /** The word in the pill. The customer's word for it, not the yard's. */
  pill: string;
  title: string;
  lead: string;
} {
  const ref = reference(order);

  switch (order.status) {
    case "Pending":
      return {
        subject: `Order ${ref} received`,
        pill: "Order received",
        title: "Your order is with our team",
        lead: "It is in the queue at the yard. We will let you know as soon as it moves.",
      };

    case "Processing":
      return {
        subject: `Order ${ref}: we are preparing your parts`,
        pill: "Preparing",
        title: "We are preparing your parts",
        lead: order.pickup
          ? "Our team is pulling your parts from the shelf and checking them over. We will call you when they are ready to collect."
          : "Our team is pulling your parts from the shelf, checking them over and packing them for freight.",
      };

    case "On Their Way":
      return order.pickup
        ? {
            subject: `Order ${ref} is ready to collect`,
            pill: "Ready",
            title: "Ready to collect",
            lead: `Your parts are packed and waiting at ${site.address.displayLine}. Bring photo ID and your order reference.`,
          }
        : {
            subject: `Order ${ref} is on its way`,
            pill: "On the way",
            title: "Your parts are on the way",
            lead: "Your order has left our yard and is with the carrier. If you need tracking details, call us and quote your order reference.",
          };

    case "Delivered":
      return order.pickup
        ? {
            subject: `Order ${ref} collected`,
            pill: "Collected",
            title: "Thanks for collecting your order",
            lead: "Our records show your parts have been picked up. If anything is not right, call us and we will sort it out.",
          }
        : {
            subject: `Order ${ref} delivered`,
            pill: "Delivered",
            title: "Your order has been delivered",
            lead: "Our records show your order has arrived. If anything is not right, call us and we will sort it out.",
          };
  }
}

/** Sent when somebody in the back office moves the order to a new status. */
export function orderStatusUpdate(order: Order): Message {
  const ref = reference(order);
  const { subject, pill, title, lead } = statusCopy(order);

  const html = emailShell({
    // The first sentence of the lead, which is written to stand on its own.
    preheader: `${lead.split(". ")[0]}. Order reference ${ref}.`,
    body: [
      `      <div style="display:inline-block;background:${BRAND};color:#ffffff;font-size:11px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;padding:6px 12px;border-radius:99px;margin:0 0 14px 0;">${esc(pill)}</div>`,
      opening(esc(title), esc(lead)),
      summaryPanel(order),
      heading("On this order"),
      itemsTable(order),
      callUs(),
    ].join("\n"),
  });

  const text = [
    title,
    "",
    lead,
    "",
    `Order reference: ${ref}`,
    `${order.pickup ? "Collect from" : "Delivering to"}: ${whereItIsGoing(order)}`,
    "",
    ...order.items.map((item) => `  ${item.quantity} x ${item.name}`),
    "",
    `Total paid: ${formatCents(order.amountCents)}`,
    "",
    `Questions? Call ${site.contact.phone} and quote reference ${ref}.`,
    "",
    site.name,
    site.address.displayLine,
  ].join("\n");

  return { subject, html, text };
}

// --------------------------------------------------------------- the yard copy

/** The one that goes to sales. Same frame, different reader. */
export function orderForSales(order: Order): Message {
  const total = formatCents(order.amountCents);

  const html = emailShell({
    preheader: `${order.customer.name} paid ${total}. ${order.pickup ? "Pickup." : "Delivery."}`,
    body: [
      opening(
        `New order &mdash; ${total}`,
        `${esc(order.customer.name)} has paid. ${order.pickup ? "Collecting from the yard." : "For delivery."}`,
      ),
      summaryPanel(order),
      itemsTable(order),
      heading("Customer"),
      `      <p style="margin:0 0 26px 0;font-size:14px;line-height:22px;color:${MUTED};">
        ${esc(order.customer.name)}<br>
        <a href="tel:${esc(order.customer.phone)}" style="color:${BRAND};text-decoration:none;">${esc(order.customer.phone)}</a><br>
        <a href="mailto:${esc(order.customer.email)}" style="color:${BRAND};text-decoration:none;">${esc(order.customer.email)}</a>
      </p>`,
    ].join("\n"),
  });

  const text = [
    `${order.customer.name} has paid ${total}.`,
    "",
    ...order.items.map(
      (item) =>
        `  ${item.quantity} x ${item.name}${item.tag ? ` (tag ${item.tag})` : ""}`,
    ),
    "",
    order.pickup ? "Pickup from the yard" : whereItIsGoing(order),
    `${order.customer.phone} | ${order.customer.email}`,
    "",
    `Order ${reference(order)} (${order.id})`,
  ].join("\n");

  return { subject: `New order, ${total}, ${order.customer.name}`, html, text };
}

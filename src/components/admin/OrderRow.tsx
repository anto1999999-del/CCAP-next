"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import PartThumbnail from "@/components/parts/PartThumbnail";
import {
  toggleOrderHidden,
  updateOrderStatus,
  type AdminState,
} from "@/app/actions/admin";
import { PART_IMAGE_PLACEHOLDER } from "@/lib/parts/images";
import { formatCents } from "@/lib/parts/price";
import { ORDER_STATUSES, type Order } from "@/lib/orders/types";
import { STATUS_TEXT } from "@/lib/orders/status";

/**
 * One order in the back office, closed and open.
 *
 * Closed it is a line: the part, a short order id, the date, the total, where
 * it is up to, and how it is going out. Open it is everything the yard needs to
 * pick and send it, which is what the row is for.
 *
 * The status control saves on change, because an admin working through a
 * morning's orders should not have to press save after every one.
 */

const EMPTY: AdminState = {};

const AU_DATE = new Intl.DateTimeFormat("en-AU", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const AU_DATETIME = new Intl.DateTimeFormat("en-AU", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default function OrderRow({ order }: { order: Order }) {
  const [open, setOpen] = useState(false);
  const [statusState, changeStatus] = useActionState(updateOrderStatus, EMPTY);
  const [hiddenState, toggleHidden] = useActionState(toggleOrderHidden, EMPTY);

  const message = statusState.message ?? hiddenState.message;
  const lead = order.items[0];

  return (
    <li
      className={`border-line/70 border-b last:border-0 ${
        order.hidden ? "opacity-55" : ""
      }`}
    >
      <div className="grid grid-cols-2 items-center gap-3 px-4 py-4 md:grid-cols-[minmax(0,2.2fr)_repeat(5,minmax(0,1fr))] md:px-5">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          className="col-span-2 min-w-0 text-left md:col-span-1"
        >
          <span className="hover:text-brand-text block truncate font-semibold text-white transition-colors">
            {lead?.name ?? "Order"}
            {order.items.length > 1 && (
              <span className="text-gray-400"> +{order.items.length - 1} more</span>
            )}
          </span>
          {lead?.vehicle && (
            <span className="block truncate text-xs text-gray-500">
              {lead.vehicle}
            </span>
          )}
        </button>

        <span
          className="truncate font-mono text-xs text-gray-500"
          title={order.id}
        >
          &hellip;{order.id.slice(-6)}
        </span>

        <span className="text-sm whitespace-nowrap text-gray-400 tabular-nums">
          {order.placedAt ? AU_DATE.format(new Date(order.placedAt)) : "-"}
        </span>

        <span className="text-sm font-semibold tabular-nums">
          {formatCents(order.amountCents)}
        </span>

        <span
          className={`text-sm font-semibold ${STATUS_TEXT[order.status] ?? "text-gray-300"}`}
        >
          {order.status}
        </span>

        <form action={changeStatus} className="justify-self-start md:justify-self-end">
          <input type="hidden" name="orderId" value={order.id} />
          <label htmlFor={`status-${order.id}`} className="sr-only">
            Status for this order
          </label>
          <StatusSelect id={`status-${order.id}`} value={order.status} />
        </form>
      </div>

      {open && (
        <div className="border-line/70 bg-admin border-t px-4 py-5 md:px-5">
          <h3 className="mb-4 text-xs font-bold tracking-[0.18em] text-gray-500 uppercase">
            Order items
          </h3>

          <ul className="mb-6 space-y-3">
            {order.items.map((item, index) => (
              <li
                key={`${order.id}-${index}`}
                className="border-line bg-card flex flex-col gap-4 rounded-xl border p-4 sm:flex-row"
              >
                <PartThumbnail
                  src={item.image ?? PART_IMAGE_PLACEHOLDER}
                  alt={item.name}
                  className="h-28 w-full rounded-lg object-cover sm:w-40"
                />

                <div className="grid min-w-0 flex-1 gap-x-8 gap-y-1.5 text-sm sm:grid-cols-2">
                  <Detail label="Item" value={item.name} />
                  <Detail label="Manufacturer" value={item.manufacturer} />
                  <Detail label="Model" value={item.model} />
                  <Detail label="Year" value={item.year} />
                  <Detail label="Type code" value={item.itemTypeCode} />
                  <Detail label="Tag number" value={item.tag} />
                  <Detail label="Inv number" value={item.invNumber} />
                  <Detail label="Stock no" value={item.stockNo} />
                  <Detail label="Quantity" value={String(item.quantity)} />
                  <Detail label="Price" value={formatCents(item.priceCents)} />
                </div>
              </li>
            ))}
          </ul>

          <h3 className="mb-4 text-xs font-bold tracking-[0.18em] text-gray-500 uppercase">
            Customer
          </h3>

          <div className="border-line bg-card mb-6 grid gap-x-8 gap-y-1.5 rounded-xl border p-4 text-sm sm:grid-cols-2">
            <Detail label="Name" value={order.customer.name} />
            <Detail label="Phone" value={order.customer.phone} />
            <Detail label="Email" value={order.customer.email} />
            <Detail label="Suburb" value={order.customer.city} />
            <Detail label="Address" value={order.customer.address} />
            <Detail label="Postcode" value={order.customer.zipcode} />
            <Detail label="Type" value={order.pickup ? "Pickup" : "Delivery"} />
            <Detail
              label="Placed"
              value={
                order.placedAt
                  ? AU_DATETIME.format(new Date(order.placedAt))
                  : undefined
              }
            />
          </div>

          <form
            action={toggleHidden}
            className="border-line bg-card flex flex-col items-start justify-between gap-3 rounded-xl border p-4 sm:flex-row sm:items-center"
          >
            <input type="hidden" name="orderId" value={order.id} />
            <input
              type="hidden"
              name="hidden"
              value={order.hidden ? "false" : "true"}
            />
            <p className="text-xs text-gray-500">
              {order.hidden
                ? "This order is hidden from the list and from every total. It has not been deleted."
                : "Hiding removes this order from the list and from all totals. It is not deleted."}
            </p>
            <HideButton hidden={order.hidden} />
          </form>

          {message && (
            <p role="status" className="mt-3 text-xs text-gray-400">
              {message}
            </p>
          )}
        </div>
      )}
    </li>
  );
}

function Detail({ label, value }: { label: string; value?: string }) {
  return (
    <p className="flex gap-2 truncate">
      <span className="w-28 flex-shrink-0 text-gray-500">{label}</span>
      <span className="truncate text-gray-200">{value || "Not recorded"}</span>
    </p>
  );
}

function StatusSelect({ id, value }: { id: string; value: string }) {
  const { pending } = useFormStatus();

  return (
    <select
      id={id}
      name="status"
      defaultValue={value}
      disabled={pending}
      onChange={(event) => event.currentTarget.form?.requestSubmit()}
      className="focus:border-brand border-line rounded-lg border bg-field px-3 py-2 text-sm text-white transition-colors focus:outline-none disabled:opacity-60"
    >
      {ORDER_STATUSES.map((status) => (
        <option key={status} value={status}>
          {status}
        </option>
      ))}
    </select>
  );
}

function HideButton({ hidden }: { hidden: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={
        hidden
          ? "border-line flex-shrink-0 rounded-lg border px-4 py-2 text-sm font-semibold text-gray-200 transition-colors hover:border-white/30 disabled:opacity-60"
          : "bg-brand hover:bg-brand-hover flex-shrink-0 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-60"
      }
    >
      {pending ? "Saving..." : hidden ? "Restore order" : "Hide payment"}
    </button>
  );
}

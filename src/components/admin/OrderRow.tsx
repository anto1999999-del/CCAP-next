"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  toggleOrderHidden,
  updateOrderStatus,
  type AdminState,
} from "@/app/actions/admin";
import { formatCents } from "@/lib/parts/price";
import { ORDER_STATUSES, type Order } from "@/lib/orders/types";

/**
 * One order in the back office.
 *
 * The status control submits on change, because an admin working through a
 * morning's orders should not have to press save after every one.
 *
 * Hiding is offered rather than deleting, and says what it does. The record of
 * money taken stays in the database either way; what changes is whether it
 * appears in this list and in the totals.
 */

const EMPTY: AdminState = {};

export default function OrderRow({ order }: { order: Order }) {
  const [statusState, changeStatus] = useActionState(updateOrderStatus, EMPTY);
  const [hiddenState, toggleHidden] = useActionState(toggleOrderHidden, EMPTY);

  const message = statusState.message ?? hiddenState.message;

  return (
    <li
      className={`bg-surface-raised rounded-2xl border p-5 ${
        order.hidden ? "border-gray-800 opacity-60" : "border-gray-800"
      }`}
    >
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="text-lg font-bold">{formatCents(order.amountCents)}</p>
          <p className="text-sm text-gray-400">
            {order.customer.name} &middot; {order.customer.email}
          </p>
          <p className="text-xs text-gray-500">
            {order.placedAt
              ? new Date(order.placedAt).toLocaleString("en-AU")
              : "Date not recorded"}
            {order.pickup ? " · Pickup" : ` · ${order.customer.city} ${order.customer.zipcode}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <form action={changeStatus}>
            <input type="hidden" name="orderId" value={order.id} />
            <label htmlFor={`status-${order.id}`} className="sr-only">
              Order status
            </label>
            <StatusSelect id={`status-${order.id}`} value={order.status} />
          </form>

          <form action={toggleHidden}>
            <input type="hidden" name="orderId" value={order.id} />
            <input
              type="hidden"
              name="hidden"
              value={order.hidden ? "false" : "true"}
            />
            <HideButton hidden={order.hidden} />
          </form>
        </div>
      </div>

      <ul className="space-y-1 text-sm text-gray-300">
        {order.items.map((item, index) => (
          <li key={`${order.id}-${index}`} className="flex justify-between gap-4">
            <span className="truncate">
              {item.quantity} &times; {item.name}
            </span>
            <span className="shrink-0 text-gray-500">
              {formatCents(item.priceCents * item.quantity)}
            </span>
          </li>
        ))}
      </ul>

      {message && (
        <p role="status" className="mt-3 text-xs text-gray-400">
          {message}
        </p>
      )}
    </li>
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
      className="focus:border-brand rounded-lg border border-gray-700 bg-[#0d0d0d] px-3 py-2 text-sm text-white focus:outline-none disabled:opacity-60"
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
      className="rounded-lg border border-gray-700 px-3 py-2 text-sm font-semibold text-gray-300 transition-colors hover:bg-gray-800 disabled:opacity-60"
    >
      {hidden ? "Restore" : "Hide"}
    </button>
  );
}

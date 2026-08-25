"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updateUserAdmin, type AdminState } from "@/app/actions/admin";
import type { Account } from "@/lib/auth/accounts";

/**
 * One account in the back office.
 *
 * Only admin access can be changed here. Editing somebody else's name, phone or
 * address is not something this page needs to do, and every field it does not
 * offer is a field that cannot be changed by mistake.
 */
const EMPTY: AdminState = {};

export default function UserRow({
  account,
  isSelf,
}: {
  account: Account;
  isSelf: boolean;
}) {
  const [state, action] = useActionState(updateUserAdmin, EMPTY);

  return (
    <li className="bg-surface-raised rounded-2xl border border-gray-800 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">
            {account.name}
            {isSelf && <span className="ml-2 text-xs text-gray-500">(you)</span>}
          </p>
          <p className="truncate text-sm text-gray-400">{account.email}</p>
        </div>

        <div className="flex items-center gap-3">
          {account.isAdmin && (
            <span className="border-brand/50 text-brand-text rounded-full border px-3 py-1 text-xs font-semibold tracking-wide uppercase">
              Admin
            </span>
          )}

          <form action={action}>
            <input type="hidden" name="userId" value={account.id} />
            <input
              type="hidden"
              name="isAdmin"
              value={account.isAdmin ? "false" : "true"}
            />
            <Toggle isAdmin={account.isAdmin} disabled={isSelf && account.isAdmin} />
          </form>
        </div>
      </div>

      {state.message && (
        <p role="status" className="mt-3 text-xs text-gray-400">
          {state.message}
        </p>
      )}
    </li>
  );
}

function Toggle({ isAdmin, disabled }: { isAdmin: boolean; disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      title={disabled ? "You cannot remove your own admin access." : undefined}
      className="rounded-lg border border-gray-700 px-3 py-2 text-sm font-semibold text-gray-300 transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isAdmin ? "Remove admin" : "Make admin"}
    </button>
  );
}

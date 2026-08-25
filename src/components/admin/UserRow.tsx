"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  deleteUser,
  sendResetLink,
  updateUserAdmin,
  type AdminState,
} from "@/app/actions/admin";
import type { Account } from "@/lib/auth/accounts";

/**
 * One account in the back office.
 *
 * The three things an admin actually does to an account sit behind one menu:
 * grant or remove admin, send a password reset, or remove the account.
 *
 * The admin never types somebody else's password. A reset link goes to the
 * customer's own inbox, because an admin who can set a password for an account
 * can then sign in as it.
 *
 * Deleting asks first. It is the one action here that cannot be undone.
 */

const EMPTY: AdminState = {};

export default function UserRow({
  account,
  isSelf,
}: {
  account: Account;
  isSelf: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const menu = useRef<HTMLDivElement>(null);

  const [adminState, changeAdmin] = useActionState(updateUserAdmin, EMPTY);
  const [resetState, sendReset] = useActionState(sendResetLink, EMPTY);
  const [deleteState, removeUser] = useActionState(deleteUser, EMPTY);

  const message = adminState.message ?? resetState.message ?? deleteState.message;

  // A menu that stays open after you click elsewhere is a menu in the way.
  useEffect(() => {
    if (!open) return;

    const close = (event: MouseEvent) => {
      if (!menu.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <li className="border-line/70 border-b last:border-0">
      <div className="grid grid-cols-2 items-center gap-3 px-4 py-3.5 md:grid-cols-[minmax(0,1.4fr)_minmax(0,2fr)_minmax(0,1fr)_minmax(0,0.8fr)_auto] md:px-5">
        <span className="truncate font-medium text-white">
          {account.name}
          {isSelf && <span className="ml-2 text-xs text-gray-500">(you)</span>}
        </span>

        <span className="truncate text-sm text-gray-400">{account.email}</span>

        <span className="text-sm text-gray-400 tabular-nums">
          {account.phone || "Not recorded"}
        </span>

        <span
          className={
            account.isAdmin
              ? "text-brand-text text-sm font-semibold"
              : "text-sm text-gray-500"
          }
        >
          {account.isAdmin ? "Admin" : "Customer"}
        </span>

        <div className="relative justify-self-start md:justify-self-end" ref={menu}>
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            aria-expanded={open}
            aria-haspopup="true"
            className="border-line rounded-lg border px-4 py-2 text-sm font-semibold text-gray-200 transition-colors hover:border-white/30 hover:text-white"
          >
            Actions
          </button>

          {open && (
            <div className="border-line bg-card absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-xl border shadow-2xl">
              <form action={changeAdmin}>
                <input type="hidden" name="userId" value={account.id} />
                <input
                  type="hidden"
                  name="isAdmin"
                  value={account.isAdmin ? "false" : "true"}
                />
                <MenuItem disabled={isSelf && account.isAdmin}>
                  {account.isAdmin ? "Revoke admin" : "Make admin"}
                </MenuItem>
              </form>

              <form action={sendReset}>
                <input type="hidden" name="email" value={account.email} />
                <MenuItem>Send password reset</MenuItem>
              </form>

              {confirming ? (
                <form action={removeUser}>
                  <input type="hidden" name="userId" value={account.id} />
                  <MenuItem danger>Yes, delete this account</MenuItem>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  disabled={isSelf}
                  className="text-brand-text w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Delete account
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {message && (
        <p role="status" className="px-5 pb-3 text-xs text-gray-400">
          {message}
        </p>
      )}
    </li>
  );
}

function MenuItem({
  children,
  disabled = false,
  danger = false,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  danger?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className={`w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40 ${
        danger ? "bg-brand/15 text-brand-text font-semibold" : "text-gray-200"
      }`}
    >
      {pending ? "Working..." : children}
    </button>
  );
}

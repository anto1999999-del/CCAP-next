"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { saveDetails, type DetailsState } from "@/app/actions/account";
import type { Account } from "@/lib/auth/accounts";

/**
 * The customer's own details.
 *
 * Saved so the checkout can be filled in for them next time. Email is shown but
 * not editable here: it identifies the account, and changing it is a different
 * job with its own confirmation step rather than a field in a form.
 */
const EMPTY: DetailsState = {};

export default function AccountDetailsForm({ account }: { account: Account }) {
  const [state, action] = useActionState(saveDetails, EMPTY);

  return (
    <form action={action} className="space-y-4">
      <Field name="name" label="Full name" defaultValue={account.name} error={state.errors?.name} />
      <Field name="phone" label="Phone" defaultValue={account.phone} autoComplete="tel" />
      <Field
        name="address"
        label="Street address"
        defaultValue={account.address}
        autoComplete="street-address"
      />
      <div className="grid grid-cols-2 gap-3">
        <Field
          name="city"
          label="Suburb"
          defaultValue={account.city}
          autoComplete="address-level2"
        />
        <Field
          name="zipcode"
          label="Postcode"
          defaultValue={account.zipcode}
          autoComplete="postal-code"
          error={state.errors?.zipcode}
        />
      </div>

      {state.message && (
        <p
          role="status"
          className="rounded-lg border border-gray-700 bg-[#0d0d0d] p-3 text-sm text-gray-200"
        >
          {state.message}
        </p>
      )}

      <Save />
    </form>
  );
}

function Field({
  name,
  label,
  defaultValue,
  autoComplete,
  error,
}: {
  name: string;
  label: string;
  defaultValue: string;
  autoComplete?: string;
  error?: string;
}) {
  return (
    <div>
      <label
        htmlFor={`account-${name}`}
        className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-400 uppercase"
      >
        {label}
      </label>
      <input
        id={`account-${name}`}
        name={name}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        className="focus:border-brand w-full rounded-lg border border-gray-800 bg-[#0d0d0d] p-3 text-base text-white transition-colors focus:outline-none"
      />
      {error && <p className="text-brand-text mt-1.5 text-sm">{error}</p>}
    </div>
  );
}

function Save() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-brand hover:bg-brand-hover rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-60"
    >
      {pending ? "Saving..." : "Save details"}
    </button>
  );
}

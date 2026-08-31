"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  requestPartPrice,
  type PriceRequestState,
} from "@/app/actions/price-request";
import { useRecaptcha } from "@/lib/useRecaptcha";

/**
 * Asking what an uncosted part is worth, from the page the part is on.
 *
 * The alternative was pointing people at /contact, where the enquiry arrives
 * describing "a mirror off a Hyundai" and someone has to write back asking
 * which one. Here the part is already known: the form carries its identifiers,
 * the action looks them up server-side, and the message that reaches sales
 * names the item, the vehicle and the stock number in its subject line.
 *
 * Collapsed until asked for. On a part page the first question is "what is
 * it?", not "who are you?", and a form sitting open pushes the photographs and
 * the specification down the page for the majority who only want to look.
 */

const LABEL = "mb-1.5 block text-xs font-semibold tracking-wide text-gray-400";
const FIELD =
  "border-line bg-shell focus:border-brand w-full rounded-lg border px-3.5 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-gray-600";

const INITIAL_STATE: PriceRequestState = { status: "idle" };

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-brand-text mt-1.5 text-xs font-semibold" role="alert">
      {message}
    </p>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-brand hover:bg-brand-hover w-full rounded-xl px-6 py-3 text-sm font-semibold text-white transition-colors disabled:opacity-60"
    >
      {pending ? "Sending..." : "Send price request"}
    </button>
  );
}

export default function PriceRequestForm({
  urgId,
  invNumber,
  itemName,
}: {
  urgId: string;
  invNumber: string;
  /** Named in the button so it is obvious which part is being asked about. */
  itemName: string;
}) {
  const [state, formAction] = useActionState(requestPartPrice, INITIAL_STATE);
  const [open, setOpen] = useState(false);
  const executeRecaptcha = useRecaptcha();

  // Handed back by the action when it refuses, because React empties a form
  // once its action has run. See the same note on the contact form.
  const values = state.values ?? {};
  const errors = state.errors ?? {};

  async function handleAction(formData: FormData) {
    const token = await executeRecaptcha("price_request");
    if (token) formData.set("recaptchaToken", token);
    formAction(formData);
  }

  if (state.status === "success") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-xl border border-green-500/40 bg-green-500/10 px-4 py-3.5 text-sm font-semibold text-green-200"
      >
        {state.message}
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="border-line hover:border-brand w-full rounded-xl border px-6 py-3 text-sm font-semibold text-white transition-colors"
      >
        Request a price by email
      </button>
    );
  }

  return (
    <form action={handleAction} noValidate className="space-y-4">
      {/*
        The part, sent so the action knows which page this came from. It is
        checked against the catalogue rather than trusted: these are an
        identifier, not a price, but the rule is the same one.
      */}
      <input type="hidden" name="urgId" value={urgId} />
      <input type="hidden" name="invNumber" value={invNumber} />

      {state.status === "error" && state.message && (
        <div
          role="status"
          aria-live="polite"
          className="border-brand/40 rounded-lg border bg-[#1a0d10] px-4 py-3 text-sm font-semibold text-gray-100"
        >
          {state.message}
        </div>
      )}

      <p className="text-xs leading-relaxed text-gray-500">
        We will price <span className="text-gray-300">{itemName}</span> and come
        straight back to you.
      </p>

      <div>
        <label htmlFor="pr-name" className={LABEL}>
          Your name
        </label>
        <input
          id="pr-name"
          name="name"
          type="text"
          required
          autoComplete="name"
          maxLength={100}
          defaultValue={values.name ?? ""}
          aria-invalid={Boolean(errors.name)}
          className={FIELD}
          placeholder="Enter your name"
        />
        <FieldError message={errors.name} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="pr-email" className={LABEL}>
            Email
          </label>
          <input
            id="pr-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            maxLength={254}
            defaultValue={values.email ?? ""}
            aria-invalid={Boolean(errors.email)}
            className={FIELD}
            placeholder="you@example.com"
          />
          <FieldError message={errors.email} />
        </div>

        <div>
          <label htmlFor="pr-phone" className={LABEL}>
            Phone
          </label>
          <input
            id="pr-phone"
            name="phone"
            type="tel"
            required
            autoComplete="tel"
            maxLength={30}
            defaultValue={values.phone ?? ""}
            aria-invalid={Boolean(errors.phone)}
            className={FIELD}
            placeholder="04XX XXX XXX"
          />
          <FieldError message={errors.phone} />
        </div>
      </div>

      <div>
        <label htmlFor="pr-message" className={LABEL}>
          Anything else? <span className="text-gray-600">(optional)</span>
        </label>
        <textarea
          id="pr-message"
          name="message"
          rows={3}
          maxLength={2000}
          defaultValue={values.message ?? ""}
          aria-invalid={Boolean(errors.message)}
          className={`${FIELD} resize-y`}
          placeholder="Fitment questions, delivery, anything we should know"
        />
        <FieldError message={errors.message} />
      </div>

      <SubmitButton />
    </form>
  );
}

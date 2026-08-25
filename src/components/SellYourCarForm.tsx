"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  submitSaleOffer,
  type SaleOfferState,
} from "@/app/actions/sell-your-car";
import { useRecaptcha } from "@/lib/useRecaptcha";

/**
 * "Sell your car" offer form.
 *
 * Mirrors the contact form: posts to a server action, which validates,
 * rate-limits and verifies reCAPTCHA before sending anything.
 *
 * The original locked its submit button for 100 seconds after each send and
 * counted down at the visitor. That is replaced by a disabled state while the
 * request is in flight, with abuse handled server-side.
 */

const LABEL = "mb-2 block text-sm font-bold text-white uppercase";

const FIELD =
  "w-full rounded border border-gray-600 bg-surface px-4 py-3 text-white placeholder-gray-500 transition-all focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none";

const INITIAL_STATE: SaleOfferState = { status: "idle" };

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-brand-text mt-1.5 text-xs font-semibold" role="alert">
      {message}
    </p>
  );
}

/** One labelled input, so the eleven fields do not repeat their wrapper. */
function Field({
  name,
  label,
  error,
  ...input
}: {
  name: string;
  label: string;
  error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={name} className={LABEL}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        aria-invalid={Boolean(error)}
        className={FIELD}
        {...input}
      />
      <FieldError message={error} />
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-brand hover:bg-brand-hover focus:ring-brand w-full rounded px-8 py-4 text-lg font-bold text-white transition-all focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#2a2a2a] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? (
        <span className="flex items-center justify-center gap-2">
          <svg
            className="h-5 w-5 animate-spin text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Sending…
        </span>
      ) : (
        "SUBMIT SALE OFFER"
      )}
    </button>
  );
}

export default function SellYourCarForm() {
  const [state, formAction] = useActionState(submitSaleOffer, INITIAL_STATE);
  const executeRecaptcha = useRecaptcha();
  const errors = state.errors ?? {};

  async function handleAction(formData: FormData) {
    const token = await executeRecaptcha("sellyourcar");
    if (token) formData.set("recaptchaToken", token);
    formAction(formData);
  }

  return (
    <form action={handleAction} noValidate>
      <div className="rounded-lg border border-gray-700 bg-[#2a2a2a] shadow-2xl">
        <div className="p-6 md:p-8 lg:p-10">
          {state.status !== "idle" && state.message && (
            <div
              role="status"
              aria-live="polite"
              className={`mb-6 rounded-lg border px-4 py-3 text-sm font-semibold ${
                state.status === "success"
                  ? "border-green-500/40 bg-green-500/10 text-green-200"
                  : "border-brand/40 bg-[#1a0d10] text-gray-100"
              }`}
            >
              {state.message}
            </div>
          )}

          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Field
                name="fullName"
                label="Full Name"
                type="text"
                required
                autoComplete="name"
                placeholder="Enter your full name"
                error={errors.fullName}
              />
              <Field
                name="location"
                label="Location"
                type="text"
                required
                placeholder="Your location"
                error={errors.location}
              />
              <Field
                name="phone"
                label="Phone"
                type="tel"
                required
                autoComplete="tel"
                placeholder="Your phone number"
                error={errors.phone}
              />
              <Field
                name="vehicleModel"
                label="Vehicle Model"
                type="text"
                required
                placeholder="e.g., Toyota Camry"
                error={errors.vehicleModel}
              />
              <Field
                name="email"
                label="Email"
                type="email"
                required
                autoComplete="email"
                placeholder="your.email@example.com"
                error={errors.email}
              />
              <Field
                name="vehicleYear"
                label="Vehicle Year"
                type="number"
                required
                placeholder="e.g., 2020"
                error={errors.vehicleYear}
              />
              <Field
                name="bodyCondition"
                label="Condition of Vehicle Body"
                type="text"
                required
                placeholder="e.g., Excellent, Good, Fair"
                error={errors.bodyCondition}
              />
              <Field
                name="mechanicalCondition"
                label="Condition of Vehicle Mechanically"
                type="text"
                required
                placeholder="e.g., Excellent, Good, Fair"
                error={errors.mechanicalCondition}
              />
            </div>

            <fieldset>
              <legend className={LABEL}>Drivable</legend>
              <div className="flex items-center gap-6">
                {(["yes", "no"] as const).map((value) => (
                  <label
                    key={value}
                    className="flex cursor-pointer items-center gap-2 text-white"
                  >
                    <input
                      type="radio"
                      name="drivable"
                      value={value}
                      required
                      className="accent-brand h-4 w-4"
                    />
                    <span className="capitalize">{value}</span>
                  </label>
                ))}
              </div>
              <FieldError message={errors.drivable} />
            </fieldset>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Field
                name="odometer"
                label="Odometer"
                type="number"
                required
                placeholder="e.g., 50000"
                error={errors.odometer}
              />
              <Field
                name="askingPrice"
                label="Asking Price"
                type="text"
                required
                placeholder="e.g., $5,000"
                error={errors.askingPrice}
              />
            </div>

            <SubmitButton />
          </div>
        </div>
      </div>
    </form>
  );
}

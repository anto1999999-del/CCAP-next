"use client";

import { useActionState, useRef } from "react";
import { useFormStatus } from "react-dom";
import { submitContactForm, type ContactState } from "@/app/actions/contact";
import { useRecaptcha } from "@/lib/useRecaptcha";

/**
 * Contact form.
 *
 * Posts to a server action, so validation, reCAPTCHA and sending all happen on
 * the server and the form keeps working without JavaScript once hydrated.
 *
 * One behaviour change from the original, deliberate: the submit button used to
 * lock for a fixed 60 seconds after every send, with a visible countdown. That
 * stopped genuine visitors sending a follow-up while doing nothing about anyone
 * posting to the endpoint directly. The button is now disabled only while the
 * request is in flight, and abuse is handled server-side by a real rate limit.
 */

const LABEL_CLASS =
  "block text-[11px] md:text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2";

const INPUT_CLASS =
  "w-full px-4 py-3 rounded-xl bg-field border border-line text-white placeholder-gray-600 transition-colors focus:outline-none focus:border-brand";

const INITIAL_STATE: ContactState = { status: "idle" };

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
      className="bg-brand hover:bg-brand-alt focus:ring-brand inline-flex min-w-[200px] items-center justify-center gap-2 rounded-xl px-10 py-3.5 font-bold text-white transition focus:ring-2 focus:ring-offset-2 focus:ring-offset-card focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? (
        <>
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
          <span>Sending…</span>
        </>
      ) : (
        <>
          <span>Send Message</span>
          <span aria-hidden="true">→</span>
        </>
      )}
    </button>
  );
}

export default function ContactForm() {
  const [state, formAction] = useActionState(submitContactForm, INITIAL_STATE);
  const executeRecaptcha = useRecaptcha();
  const formRef = useRef<HTMLFormElement>(null);

  /**
   * Mints a fresh reCAPTCHA token and puts it on the payload before the action
   * runs. Tokens are short-lived, so one is taken per submission rather than
   * held from page load.
   */
  async function handleAction(formData: FormData) {
    const token = await executeRecaptcha("contact");
    if (token) formData.set("recaptchaToken", token);
    formAction(formData);
  }

  const errors = state.errors ?? {};

  return (
    <div className="mx-auto w-full">
      <div className="border-line bg-card overflow-hidden rounded-2xl border">
        <div className="p-6 sm:p-8 md:p-10">
          {state.status !== "idle" && state.message && (
            <div
              role="status"
              aria-live="polite"
              className={`mb-6 rounded-lg border px-4 py-3 text-sm font-semibold ${
                /*
                  Dark, like the page it sits on. This was a light-theme box:
                  a pale red panel with dark red text, on black.
                */
                state.status === "success"
                  ? "border-green-500/40 bg-green-500/10 text-green-200"
                  : "border-brand/40 bg-[#1a0d10] text-gray-100"
              }`}
            >
              {state.message}
            </div>
          )}

          <form ref={formRef} id="contact" action={handleAction} noValidate>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
              <div>
                <label htmlFor="name" className={LABEL_CLASS}>
                  Full Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  autoComplete="name"
                  maxLength={100}
                  aria-invalid={Boolean(errors.name)}
                  className={INPUT_CLASS}
                  placeholder="Enter your full name"
                />
                <FieldError message={errors.name} />
              </div>

              <div>
                <label htmlFor="subject" className={LABEL_CLASS}>
                  Subject
                </label>
                <input
                  id="subject"
                  name="subject"
                  type="text"
                  required
                  maxLength={150}
                  aria-invalid={Boolean(errors.subject)}
                  className={INPUT_CLASS}
                  placeholder="What can we help you with?"
                />
                <FieldError message={errors.subject} />
              </div>

              <div>
                <label htmlFor="email" className={LABEL_CLASS}>
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  maxLength={254}
                  aria-invalid={Boolean(errors.email)}
                  className={INPUT_CLASS}
                  placeholder="Enter your email address"
                />
                <FieldError message={errors.email} />
              </div>

              <div>
                <label htmlFor="phone" className={LABEL_CLASS}>
                  Phone Number
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  autoComplete="tel"
                  maxLength={30}
                  aria-invalid={Boolean(errors.phone)}
                  className={INPUT_CLASS}
                  placeholder="Enter your phone number"
                />
                <FieldError message={errors.phone} />
              </div>
            </div>

            <div className="mt-6">
              <label htmlFor="message" className={LABEL_CLASS}>
                Message Details
              </label>
              <textarea
                id="message"
                name="message"
                rows={6}
                required
                maxLength={4000}
                aria-invalid={Boolean(errors.message)}
                className={`${INPUT_CLASS} min-h-[140px] resize-y`}
                placeholder="Tell us how we can assist you..."
              />
              <FieldError message={errors.message} />
            </div>

            <div className="mt-8 flex justify-center">
              <SubmitButton />
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

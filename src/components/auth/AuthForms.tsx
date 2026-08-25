"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { register, signIn, type AuthState } from "@/app/actions/auth";
import { BRAND_GRADIENT } from "@/components/layout/PageHero";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/credentials";
import { site } from "@/lib/site";

/**
 * Sign in, or create an account.
 *
 * Both on one page, because from a customer's side they are the same decision:
 * "I want to see my orders". Which form is showing is the only thing this
 * component tracks; everything else is the server's answer.
 *
 * Laid out as two panels rather than a form floating in the middle of a black
 * page. The left says why an account is worth having, which is the question
 * somebody is actually asking when a sign-in page appears in front of them.
 */

const EMPTY: AuthState = {};

const REASONS = [
  "Your orders and their status, in one place",
  "Delivery details filled in for you at checkout",
  "A record of every part you have bought from us",
];

export default function AuthForms({ next }: { next: string }) {
  const [mode, setMode] = useState<"signin" | "register">("signin");

  return (
    <div className="bg-canvas min-h-[calc(100vh-4rem)] px-4 py-12 text-white md:py-16">
      <div className="border-line bg-card mx-auto grid w-full max-w-5xl overflow-hidden rounded-3xl border shadow-[0_24px_70px_rgba(0,0,0,0.55)] lg:grid-cols-[1.05fr_1fr]">
        <aside
          className="relative hidden flex-col justify-between p-10 lg:flex"
          style={BRAND_GRADIENT}
        >
          <div>
            <p className="text-brand-text mb-4 text-[11px] font-semibold tracking-[0.28em] uppercase">
              {site.name}
            </p>
            <h2 className="mb-6 text-3xl leading-tight font-extrabold tracking-tight">
              Your parts,
              <br />
              your orders,
              <br />
              in one place.
            </h2>

            <ul className="space-y-3">
              {REASONS.map((reason) => (
                <li key={reason} className="flex gap-3 text-sm text-white/80">
                  <span
                    aria-hidden="true"
                    className="bg-brand mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full"
                  />
                  {reason}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-sm text-white/60">
            Prefer to talk to somebody?{" "}
            <a
              href={`tel:${site.contact.phoneE164}`}
              className="font-semibold text-white hover:underline"
            >
              {site.contact.phone}
            </a>
          </p>
        </aside>

        <div className="p-8 sm:p-10">
          <h1 className="mb-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
            {mode === "signin" ? "Sign in" : "Create an account"}
          </h1>
          <p className="mb-8 text-sm text-gray-400">
            {mode === "signin"
              ? "Welcome back."
              : "It takes a moment, and your next order fills itself in."}
          </p>

          {mode === "signin" ? <SignInForm next={next} /> : <RegisterForm />}

          <p className="border-line mt-8 border-t pt-6 text-sm text-gray-400">
            {mode === "signin" ? "No account yet? " : "Already have one? "}
            <button
              type="button"
              onClick={() =>
                setMode(mode === "signin" ? "register" : "signin")
              }
              className="text-brand-text font-semibold hover:underline"
            >
              {mode === "signin" ? "Create one" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

function SignInForm({ next }: { next: string }) {
  const [state, action] = useActionState(signIn, EMPTY);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={next} />
      <Field
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        error={state.errors?.email}
      />
      <Field
        name="password"
        label="Password"
        type="password"
        autoComplete="current-password"
        error={state.errors?.password}
      />

      <Problem message={state.message} />
      <Submit>Sign in</Submit>

      <p className="text-center text-sm">
        <Link
          href="/forgot-password"
          className="text-gray-400 transition-colors hover:text-white"
        >
          Forgotten your password?
        </Link>
      </p>
    </form>
  );
}

function RegisterForm() {
  const [state, action] = useActionState(register, EMPTY);

  return (
    <form action={action} className="space-y-5">
      <Field
        name="name"
        label="Full name"
        type="text"
        autoComplete="name"
        error={state.errors?.name}
      />
      <Field
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        error={state.errors?.email}
      />
      <Field
        name="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        hint={`At least ${MIN_PASSWORD_LENGTH} characters. Length beats symbols.`}
        error={state.errors?.password}
      />

      <Problem message={state.message} />
      <Submit>Create account</Submit>
    </form>
  );
}

function Field({
  name,
  label,
  type,
  autoComplete,
  hint,
  error,
}: {
  name: string;
  label: string;
  type: string;
  autoComplete: string;
  hint?: string;
  error?: string;
}) {
  const describedBy = [hint && `${name}-hint`, error && `${name}-error`]
    .filter(Boolean)
    .join(" ");

  return (
    <div>
      <label
        htmlFor={name}
        className="mb-2 block text-xs font-semibold tracking-wider text-gray-400 uppercase"
      >
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={`focus:ring-brand/30 w-full rounded-xl border bg-[#0b0b0d] px-4 py-3 text-base text-white transition-colors focus:ring-4 focus:outline-none ${
          error ? "border-brand" : "focus:border-brand border-white/10"
        }`}
      />
      {hint && (
        <p id={`${name}-hint`} className="mt-2 text-xs text-gray-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${name}-error`} className="text-brand-text mt-2 text-sm">
          {error}
        </p>
      )}
    </div>
  );
}

function Problem({ message }: { message?: string }) {
  if (!message) return null;

  return (
    <p
      role="alert"
      className="border-brand/40 rounded-xl border bg-[#1a0d10] p-3.5 text-sm text-gray-100"
    >
      {message}
    </p>
  );
}

function Submit({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-brand hover:bg-brand-hover focus-visible:ring-brand focus-visible:ring-offset-card w-full rounded-xl px-4 py-3.5 font-bold tracking-wide text-white transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-60"
    >
      {pending ? "Please wait..." : children}
    </button>
  );
}

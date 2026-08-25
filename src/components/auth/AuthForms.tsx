"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { register, signIn, type AuthState } from "@/app/actions/auth";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/credentials";

/**
 * Sign in, or create an account.
 *
 * Both on one page, because the two are the same decision from a customer's
 * point of view: "I want to see my orders". Which form is showing is the only
 * thing this component tracks; everything else is the server's answer.
 */

const EMPTY: AuthState = {};

export default function AuthForms({ next }: { next: string }) {
  const [mode, setMode] = useState<"signin" | "register">("signin");

  return (
    <div className="bg-surface min-h-[70vh] px-4 py-14 text-white">
      <div className="mx-auto w-full max-w-md">
        <h1 className="mb-2 text-3xl font-extrabold tracking-tight">
          {mode === "signin" ? "Sign in" : "Create an account"}
        </h1>
        <p className="mb-8 text-sm text-gray-400">
          {mode === "signin"
            ? "To see your orders and save your delivery details."
            : "So your orders and delivery details are here next time."}
        </p>

        {mode === "signin" ? (
          <SignInForm next={next} />
        ) : (
          <RegisterForm />
        )}

        <p className="mt-6 text-sm text-gray-400">
          {mode === "signin" ? (
            <>
              No account yet?{" "}
              <button
                type="button"
                onClick={() => setMode("register")}
                className="text-brand-text font-semibold hover:underline"
              >
                Create one
              </button>
            </>
          ) : (
            <>
              Already have one?{" "}
              <button
                type="button"
                onClick={() => setMode("signin")}
                className="text-brand-text font-semibold hover:underline"
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

function SignInForm({ next }: { next: string }) {
  const [state, action] = useActionState(signIn, EMPTY);

  return (
    <form action={action} className="space-y-4">
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

      <p className="text-sm text-gray-400">
        <Link href="/forgot-password" className="hover:text-white hover:underline">
          Forgotten your password?
        </Link>
      </p>
    </form>
  );
}

function RegisterForm() {
  const [state, action] = useActionState(register, EMPTY);

  return (
    <form action={action} className="space-y-4">
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
        hint={`At least ${MIN_PASSWORD_LENGTH} characters. Length matters more than symbols.`}
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
        className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-400 uppercase"
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
        className="focus:border-brand w-full rounded-lg border border-gray-800 bg-[#0d0d0d] p-3 text-base text-white transition-colors focus:outline-none"
      />
      {hint && (
        <p id={`${name}-hint`} className="mt-1.5 text-xs text-gray-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${name}-error`} className="text-brand-text mt-1.5 text-sm">
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
      className="rounded-lg border border-gray-700 bg-[#0d0d0d] p-3 text-sm text-gray-200"
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
      className="bg-brand hover:bg-brand-hover w-full rounded-lg px-4 py-3 font-semibold text-white transition-colors disabled:opacity-60"
    >
      {pending ? "Please wait..." : children}
    </button>
  );
}

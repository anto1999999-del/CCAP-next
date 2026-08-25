"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  requestPasswordReset,
  resetPassword,
  type ResetState,
} from "@/app/actions/auth";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/credentials";
import { site } from "@/lib/site";

/**
 * Asking for a reset link, and using one.
 *
 * The request form always answers the same way, whether or not the address has
 * an account here. That is not vagueness for its own sake: a form that says "no
 * account with that email" is a way of finding out who has one.
 */

const EMPTY: ResetState = {};

function Shell({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-canvas px-4 py-14 text-white md:py-20">
      <div className="border-line bg-card mx-auto w-full max-w-md rounded-3xl border p-8 shadow-[0_24px_70px_rgba(0,0,0,0.55)] sm:p-10">
        <h1 className="mb-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
          {title}
        </h1>
        <p className="mb-8 text-sm text-gray-400">{intro}</p>
        {children}
      </div>
    </div>
  );
}

export function ForgotPasswordForm() {
  const [state, action] = useActionState(requestPasswordReset, EMPTY);

  return (
    <Shell
      title="Forgotten your password"
      intro="Tell us your email address and we will send you a link to set a new one."
    >
      {state.done ? (
        <>
          <p
            role="status"
            className="border-line rounded-xl border bg-[#0b0b0d] p-4 text-sm text-gray-200"
          >
            {state.message}
          </p>
          <p className="mt-6 text-sm text-gray-400">
            Nothing arrived? Check the spam folder, or call us on{" "}
            <a
              href={`tel:${site.contact.phoneE164}`}
              className="text-brand-text font-semibold"
            >
              {site.contact.phone}
            </a>
            .
          </p>
        </>
      ) : (
        <form action={action} className="space-y-5">
          <Field
            name="email"
            label="Email"
            type="email"
            autoComplete="email"
            error={state.errors?.email}
          />
          {state.message && <Problem message={state.message} />}
          <Submit>Send the link</Submit>
        </form>
      )}

      <p className="border-line mt-8 border-t pt-6 text-sm text-gray-400">
        Remembered it?{" "}
        <Link href="/login" className="text-brand-text font-semibold hover:underline">
          Sign in
        </Link>
      </p>
    </Shell>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPassword, EMPTY);

  if (state.done) {
    return (
      <Shell title="Password changed" intro="You can sign in with it now.">
        <Link
          href="/login"
          className="bg-brand hover:bg-brand-hover block w-full rounded-xl px-4 py-3.5 text-center font-bold text-white transition-colors"
        >
          Sign in
        </Link>
      </Shell>
    );
  }

  return (
    <Shell
      title="Set a new password"
      intro="Choose something you have not used elsewhere."
    >
      <form action={action} className="space-y-5">
        <input type="hidden" name="token" value={token} />
        <Field
          name="password"
          label="New password"
          type="password"
          autoComplete="new-password"
          hint={`At least ${MIN_PASSWORD_LENGTH} characters. Length beats symbols.`}
          error={state.errors?.password}
        />
        <Field
          name="confirm"
          label="Type it again"
          type="password"
          autoComplete="new-password"
          error={state.errors?.confirm}
        />
        {state.message && <Problem message={state.message} />}
        <Submit>Change my password</Submit>
      </form>
    </Shell>
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
        className={`focus:ring-brand/30 w-full rounded-xl border bg-[#0b0b0d] px-4 py-3 text-base text-white transition-colors focus:ring-4 focus:outline-none ${
          error ? "border-brand" : "focus:border-brand border-white/10"
        }`}
      />
      {hint && <p className="mt-2 text-xs text-gray-500">{hint}</p>}
      {error && <p className="text-brand-text mt-2 text-sm">{error}</p>}
    </div>
  );
}

function Problem({ message }: { message: string }) {
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
      className="bg-brand hover:bg-brand-hover w-full rounded-xl px-4 py-3.5 font-bold tracking-wide text-white transition-colors disabled:opacity-60"
    >
      {pending ? "Please wait..." : children}
    </button>
  );
}

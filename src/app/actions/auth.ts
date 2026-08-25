"use server";

import { redirect } from "next/navigation";
import {
  LoginSchema,
  RegisterSchema,
  firstErrors,
} from "@/lib/auth/credentials";
import {
  createAccount,
  findByEmail,
  verifyCredentials,
} from "@/lib/auth/accounts";
import { createSession, destroySession } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Signing in, signing up, signing out.
 *
 * Failures are deliberately vague about which half was wrong. "No account with
 * that email" is a way to find out which email addresses have accounts, one
 * guess at a time.
 *
 * Attempts are rate limited per email address. Without it, a password can be
 * guessed as fast as the server will answer.
 */

export type AuthState = {
  errors?: Record<string, string>;
  message?: string;
};

/** Enough for somebody who has genuinely forgotten, few enough to stop a script. */
const ATTEMPTS_PER_HOUR = 10;

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

/** Only paths on this site, so a crafted ?next= cannot bounce someone offsite. */
function safeDestination(value: string): string {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/my-account";
}

export async function signIn(
  _previous: AuthState,
  form: FormData,
): Promise<AuthState> {
  const parsed = LoginSchema.safeParse({
    email: field(form, "email"),
    password: field(form, "password"),
  });

  if (!parsed.success) {
    return { errors: firstErrors(parsed.error) };
  }

  const { email, password } = parsed.data;

  const limit = rateLimit(`signin:${email.toLowerCase()}`, {
    limit: ATTEMPTS_PER_HOUR,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.allowed) {
    return {
      message: `Too many sign-in attempts. Try again in ${Math.ceil(limit.retryAfter / 60)} minutes.`,
    };
  }

  const account = await verifyCredentials(email, password);
  if (!account) {
    return { message: "That email address and password do not match." };
  }

  await createSession(account.id);
  redirect(safeDestination(field(form, "next")));
}

export async function register(
  _previous: AuthState,
  form: FormData,
): Promise<AuthState> {
  const parsed = RegisterSchema.safeParse({
    name: field(form, "name"),
    email: field(form, "email"),
    password: field(form, "password"),
  });

  if (!parsed.success) {
    return { errors: firstErrors(parsed.error) };
  }

  const { name, email, password } = parsed.data;

  const limit = rateLimit(`register:${email.toLowerCase()}`, {
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.allowed) {
    return { message: "Too many attempts. Please try again later." };
  }

  if (await findByEmail(email)) {
    /*
      Deliberately worded as advice rather than "that email is taken", which
      confirms an address has an account here to anyone who asks.
    */
    return {
      message:
        "That email cannot be used to create a new account. If it is yours, sign in or reset your password.",
    };
  }

  const account = await createAccount({ name, email, password });
  await createSession(account.id);
  redirect("/my-account");
}

export async function signOut(): Promise<void> {
  await destroySession();
  redirect("/");
}

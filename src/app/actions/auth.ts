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
import { accountForGoogle, identityFromToken } from "@/lib/auth/google";
import { beginReset, completeReset } from "@/lib/auth/reset";
import { passwordField } from "@/lib/auth/credentials";
import { sendEmail } from "@/lib/email";
import { site } from "@/lib/site";
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

/**
 * Sign in with Google.
 *
 * Most customers here are Google customers: 35 of the 62 existing accounts have
 * no password at all. The browser sends the ID token Google gave it, and it is
 * verified against Google before anything in it is believed.
 */
export async function signInWithGoogle(idToken: string): Promise<AuthState> {
  if (typeof idToken !== "string" || idToken.length < 20) {
    return { message: "That Google sign-in could not be read." };
  }

  const identity = await identityFromToken(idToken);
  if (!identity) {
    return { message: "Google could not confirm that sign-in. Please try again." };
  }

  const account = await accountForGoogle(identity);
  await createSession(account.id);
  return {};
}

export type ResetState = {
  errors?: Record<string, string>;
  message?: string;
  done?: boolean;
};

/**
 * Ask for a reset link.
 *
 * Always answers the same way, whether or not the address has an account.
 * Anything else turns this form into a way of finding out who has one.
 */
export async function requestPasswordReset(
  _previous: ResetState,
  form: FormData,
): Promise<ResetState> {
  const email = field(form, "email").trim();
  const sameAnswer: ResetState = {
    done: true,
    message:
      "If that address has an account, a reset link is on its way. It is good for one hour.",
  };

  if (!email.includes("@")) {
    return { errors: { email: "Enter your email address." } };
  }

  const limit = rateLimit(`reset:${email.toLowerCase()}`, {
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.allowed) return sameAnswer;

  const token = await beginReset(email);
  if (!token) return sameAnswer;

  const origin = process.env.NEXT_PUBLIC_SITE_ORIGIN ?? site.url;
  const link = `${origin}/reset-password/${token}`;

  const sent = await sendEmail({
    to: email,
    subject: `Reset your ${site.name} password`,
    text: [
      "Somebody asked to reset the password on this account.",
      "",
      link,
      "",
      "The link works once and expires in an hour. If this was not you, ignore",
      `this email, or call us on ${site.contact.phone}.`,
    ].join("\n"),
  });

  if (!sent.ok) {
    console.error("[auth] reset email failed:", sent.reason);
    return {
      message:
        `We could not send that email just now. Please call us on ${site.contact.phone} and we will sort it out.`,
    };
  }

  return sameAnswer;
}

/** Set a new password from a reset link. */
export async function resetPassword(
  _previous: ResetState,
  form: FormData,
): Promise<ResetState> {
  const token = field(form, "token");
  const parsed = passwordField.safeParse(field(form, "password"));

  if (!parsed.success) {
    return { errors: { password: parsed.error.issues[0]?.message ?? "" } };
  }

  if (field(form, "confirm") !== parsed.data) {
    return { errors: { confirm: "Those two passwords are not the same." } };
  }

  const changed = await completeReset(token, parsed.data);
  if (!changed) {
    return {
      message:
        "That link has expired or has already been used. Ask for a new one.",
    };
  }

  return { done: true, message: "Your password has been changed. You can sign in now." };
}

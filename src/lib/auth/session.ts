import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

/**
 * Who is signed in.
 *
 * The session is a signed token in an httpOnly cookie. The current site keeps
 * its token in localStorage, where any script on the page can read it: one
 * injected script and an attacker has a customer's session for the seven days
 * it lasts. A cookie the browser will not hand to JavaScript cannot be stolen
 * that way, and it is sent automatically, so nothing has to remember to attach
 * it.
 *
 * The token says who you are and nothing else. Whether you are an admin is read
 * from the database when it matters, so revoking an admin takes effect on their
 * next request rather than whenever their week-old token expires.
 */

const COOKIE = "ccap_session";

/** A week, matching the current site's tokens. */
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export type Session = { userId: string };

function secret(): Uint8Array {
  const value = process.env.SESSION_SECRET ?? process.env.JWT_SECRET;
  if (!value || value.length < 24) {
    throw new Error(
      "SESSION_SECRET must be set to at least 24 characters to sign sessions.",
    );
  }
  return new TextEncoder().encode(value);
}

export async function createSession(userId: string): Promise<void> {
  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secret());

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    // Off in development, where there is no certificate on localhost.
    secure: process.env.NODE_ENV === "production",
    // Lax rather than strict: a customer following a link back from an email or
    // a payment redirect should still be signed in when they arrive.
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

/** The signed-in user's id, or null. Never throws on a bad or expired token. */
export async function readSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret());
    const userId = payload.userId;
    return typeof userId === "string" && userId.length > 0 ? { userId } : null;
  } catch {
    // Expired, tampered with, or signed with a secret that has since changed.
    return null;
  }
}

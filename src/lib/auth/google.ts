import "server-only";
import { OAuth2Client } from "google-auth-library";
import { ObjectId } from "mongodb";
import { users } from "../db/mongo";
import { toAccount, type Account } from "./accounts";

/**
 * Signing in with Google.
 *
 * This is how most customers get in: 35 of the 62 existing accounts were
 * created through Google and have no password at all, so an email-and-password
 * form on its own locks the majority of them out.
 *
 * The browser hands us an ID token from Google. It is verified here, against
 * Google's own keys and against our client id, before a word of it is believed.
 * An unverified token is a claim to be whoever the sender likes.
 */

let client: OAuth2Client | null = null;

export function isGoogleConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  );
}

function verifier(): OAuth2Client {
  client ??= new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  return client;
}

export type GoogleIdentity = {
  email: string;
  name: string;
  googleId: string;
};

/** The person Google says this token belongs to, or null if it does not check out. */
export async function identityFromToken(
  idToken: string,
): Promise<GoogleIdentity | null> {
  try {
    const ticket = await verifier().verifyIdToken({
      idToken,
      // Rejects a token minted for some other application, which is the whole
      // point of the check.
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload?.email?.trim().toLowerCase();

    // Google will say whether it has confirmed the address. An unconfirmed one
    // is not proof of anything: it would let somebody claim another person's
    // account by signing up with their address.
    if (!email || payload?.email_verified === false) return null;

    return {
      email,
      name: payload?.name?.trim() || email.split("@")[0],
      googleId: payload?.sub ?? "",
    };
  } catch {
    return null;
  }
}

/**
 * The account for a Google identity, created on first sign-in.
 *
 * Matched on the email address, so somebody who registered with a password and
 * later signs in with Google lands on the same account rather than a second
 * one. Their password is left alone: they can still use either.
 */
export async function accountForGoogle(
  identity: GoogleIdentity,
): Promise<Account> {
  const collection = await users();

  const existing = await collection.findOne({
    email: {
      $regex: `^${identity.email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
      $options: "i",
    },
  });

  if (existing) {
    // Record the Google id if this is the first time they have used it, so the
    // account's history is honest about how it is being accessed.
    if (!existing.googleId) {
      await collection.updateOne(
        { _id: existing._id },
        { $set: { googleId: identity.googleId } },
      );
    }
    return toAccount(existing);
  }

  const _id = new ObjectId();
  await collection.insertOne({
    _id,
    name: identity.name,
    email: identity.email,
    googleId: identity.googleId,
    isGoogleLogin: true,
    isAdmin: false,
    // Empty rather than absent, matching the accounts the current site created.
    // Nothing can sign in with it: an empty hash never compares equal.
    password: "",
    phone: "",
    address: "",
    city: "",
    zipcode: "",
    orders: [],
    createdAt: new Date(),
  } as never);

  const created = await collection.findOne({ _id });
  if (!created) throw new Error("The account could not be read back.");
  return toAccount(created);
}

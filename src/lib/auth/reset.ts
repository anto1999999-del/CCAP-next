import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { users } from "../db/mongo";
import { changePassword } from "./accounts";

/**
 * Resetting a forgotten password.
 *
 * The token in the email is random and single use. What is stored is its SHA-256
 * hash, never the token itself, for the same reason passwords are hashed: a
 * leaked database should not hand somebody a working reset link for every
 * account in it. The link carries the only copy.
 *
 * This matches how the current site does it, including the hash and the hour's
 * expiry, so links already in inboxes keep working.
 */

/** Long enough that guessing is hopeless, short enough to fit in a URL. */
const TOKEN_BYTES = 32;

const VALID_FOR_MS = 60 * 60 * 1000;

function fingerprint(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Start a reset, returning the token to email.
 *
 * Returns null when there is no such account, and the caller must not say so:
 * "no account with that email" turns this form into a way of finding out who
 * has an account here.
 */
export async function beginReset(email: string): Promise<string | null> {
  const collection = await users();

  const user = await collection.findOne({
    email: {
      $regex: `^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
      $options: "i",
    },
  });

  if (!user) return null;

  const token = randomBytes(TOKEN_BYTES).toString("hex");

  await collection.updateOne(
    { _id: user._id },
    {
      $set: {
        resetToken: fingerprint(token),
        tokenExpiration: new Date(Date.now() + VALID_FOR_MS),
      },
    },
  );

  return token;
}

/**
 * Finish a reset.
 *
 * The token is matched by its hash and its expiry together, so an old link
 * fails the same way an invented one does.
 */
export async function completeReset(
  token: string,
  password: string,
): Promise<boolean> {
  const collection = await users();

  const user = await collection.findOne({
    resetToken: fingerprint(token),
    tokenExpiration: { $gt: new Date() },
  });

  if (!user) return false;

  // Clears the token as it sets the password, so a link works exactly once.
  await changePassword(user._id.toString(), password);
  return true;
}

/** Whether a link is still worth showing a form for. */
export async function isResetTokenValid(token: string): Promise<boolean> {
  const collection = await users();

  return (
    (await collection.countDocuments(
      {
        resetToken: fingerprint(token),
        tokenExpiration: { $gt: new Date() },
      },
      { limit: 1 },
    )) === 1
  );
}

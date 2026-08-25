import "server-only";
import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import { users, type UserDocument } from "../db/mongo";
import { readSession } from "./session";

/**
 * Accounts.
 *
 * Passwords are bcrypt hashes at cost 10, which is what the existing accounts
 * in the database were created with, so people can sign in with the password
 * they already have.
 *
 * Some accounts were created through Google and have no password at all. They
 * must not be able to sign in with an empty one, which is what happens if a
 * missing hash is compared carelessly.
 */

const BCRYPT_COST = 10;

/** What the site needs to know about the person using it. */
export type Account = {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  phone: string;
  address: string;
  city: string;
  zipcode: string;
};

export function toAccount(user: UserDocument): Account {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    isAdmin: user.isAdmin === true,
    phone: user.phone ?? "",
    address: user.address ?? "",
    city: user.city ?? "",
    zipcode: user.zipcode ?? "",
  };
}

/** Email is stored as typed but must match regardless of case. */
function emailQuery(email: string) {
  return {
    email: { $regex: `^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
  };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

/**
 * Check a password against an account.
 *
 * Returns null rather than saying which of the two was wrong: telling someone
 * that an email exists but the password is wrong tells them the email exists.
 */
export async function verifyCredentials(
  email: string,
  password: string,
): Promise<Account | null> {
  const collection = await users();
  const user = await collection.findOne(emailQuery(email));

  // A Google account has no password. Comparing against a missing hash must
  // fail rather than throw or, worse, pass.
  if (!user?.password) return null;

  const matches = await bcrypt.compare(password, user.password);
  return matches ? toAccount(user) : null;
}

export async function findByEmail(email: string): Promise<UserDocument | null> {
  return (await users()).findOne(emailQuery(email));
}

export async function createAccount(input: {
  name: string;
  email: string;
  password: string;
}): Promise<Account> {
  const collection = await users();
  const now = new Date();

  const result = await collection.insertOne({
    _id: new ObjectId(),
    name: input.name,
    email: input.email,
    password: await hashPassword(input.password),
    isAdmin: false,
    isGoogleLogin: false,
    phone: "",
    address: "",
    city: "",
    zipcode: "",
    orders: [],
    createdAt: now,
  } as UserDocument & { createdAt: Date });

  const created = await collection.findOne({ _id: result.insertedId });
  if (!created) throw new Error("The account could not be read back after creation.");
  return toAccount(created);
}

export async function updateDetails(
  userId: string,
  details: Pick<Account, "name" | "phone" | "address" | "city" | "zipcode">,
): Promise<void> {
  const collection = await users();
  await collection.updateOne(
    { _id: new ObjectId(userId) },
    { $set: { ...details } },
  );
}

export async function changePassword(
  userId: string,
  password: string,
): Promise<void> {
  const collection = await users();
  await collection.updateOne(
    { _id: new ObjectId(userId) },
    {
      $set: { password: await hashPassword(password) },
      // A reset token is spent once. Leaving it valid means a stolen email link
      // still works after the password has been changed.
      $unset: { resetToken: "", tokenExpiration: "" },
    },
  );
}

/**
 * The signed-in account, read fresh from the database.
 *
 * Not taken from the session token: an account that has been made an admin, or
 * had it taken away, should change on the next request rather than when a
 * week-old token happens to expire.
 */
export async function currentAccount(): Promise<Account | null> {
  const session = await readSession();
  if (!session) return null;

  let id: ObjectId;
  try {
    id = new ObjectId(session.userId);
  } catch {
    // A token carrying something that is not an id: treat as signed out.
    return null;
  }

  const user = await (await users()).findOne({ _id: id });
  return user ? toAccount(user) : null;
}

export async function requireAdmin(): Promise<Account | null> {
  const account = await currentAccount();
  return account?.isAdmin ? account : null;
}

/** Every account, newest first. Used where a total is wanted rather than a page. */
export async function listAccounts(limit = 500): Promise<Account[]> {
  const documents = await (await users())
    .find({})
    .sort({ _id: -1 })
    .limit(limit)
    .toArray();

  return documents.map(toAccount);
}

export type AccountPage = {
  accounts: Account[];
  page: number;
  pageCount: number;
  total: number;
  from: number;
  to: number;
};

/**
 * A page of accounts, searched by the three things an admin has to hand: a
 * name, an email address, or a phone number.
 */
export async function searchAccounts({
  search = "",
  page = 1,
  perPage = 20,
}: { search?: string; page?: number; perPage?: number } = {}): Promise<AccountPage> {
  const collection = await users();
  const term = search.trim();

  const filter: Record<string, unknown> = {};
  if (term) {
    const like = {
      $regex: term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      $options: "i",
    };
    filter.$or = [{ name: like }, { email: like }, { phone: like }];
  }

  const total = await collection.countDocuments(filter);
  const size = Math.min(100, Math.max(1, perPage));
  const pageCount = Math.max(1, Math.ceil(total / size));
  const safePage = Math.min(Math.max(1, page), pageCount);

  const documents = await collection
    .find(filter)
    .sort({ _id: -1 })
    .skip((safePage - 1) * size)
    .limit(size)
    .toArray();

  return {
    accounts: documents.map(toAccount),
    page: safePage,
    pageCount,
    total,
    from: total === 0 ? 0 : (safePage - 1) * size + 1,
    to: Math.min(safePage * size, total),
  };
}

/**
 * Remove an account.
 *
 * Their orders are left alone. An order is a record of money that changed
 * hands, and deleting the customer should not delete the sale: the order keeps
 * the name, email and address it was placed with.
 */
export async function deleteAccount(userId: string): Promise<void> {
  await (await users()).deleteOne({ _id: new ObjectId(userId) });
}

/**
 * Grant or remove admin access.
 *
 * The caller must already have checked that the person asking is an admin.
 * Kept as a plain write so that check cannot be accidentally satisfied by this
 * function itself.
 */
export async function setAdmin(userId: string, isAdmin: boolean): Promise<void> {
  await (await users()).updateOne(
    { _id: new ObjectId(userId) },
    { $set: { isAdmin } },
  );
}

/** How many admins there are, so the last one cannot remove themselves. */
export async function countAdmins(): Promise<number> {
  return (await users()).countDocuments({ isAdmin: true });
}

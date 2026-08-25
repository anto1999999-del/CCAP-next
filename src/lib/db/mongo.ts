import "server-only";
import { MongoClient, type Collection, type Db, type ObjectId } from "mongodb";

/**
 * The database.
 *
 * The same one the current site uses, with the same collections and the same
 * document shapes, because the customers, orders and accounts in it are real
 * and predate this rebuild. Mongoose created those documents; this reads and
 * writes them with the driver directly, which is the same wire format without
 * the schema layer on top.
 *
 * One client for the whole process, kept on globalThis so that a hot reload in
 * development does not open a new pool every time a file is saved. This is the
 * pattern the MongoDB documentation gives for exactly this reason.
 */

/** Documents as mongoose left them. Optional fields really are often absent. */
export type UserDocument = {
  _id: ObjectId;
  name: string;
  email: string;
  password?: string;
  isAdmin?: boolean;
  isGoogleLogin?: boolean;
  /** Google's own id for the person, recorded when they first sign in with it. */
  googleId?: string;
  phone?: string;
  address?: string;
  city?: string;
  zipcode?: string;
  resetToken?: string;
  tokenExpiration?: Date;
  orders?: ObjectId[];
};

export type OrderItemDocument = {
  name: string;
  price: number;
  quantity: number;
  image?: string;
  urgId?: string;
  invNumber?: string;
  stockNo?: string;
  manufacturer?: string;
  model?: string;
  year?: number;
  productUrl?: string;
};

export type OrderDocument = {
  _id: ObjectId;
  user: ObjectId;
  items: OrderItemDocument[];
  /** Dollars, as the current site stores them. */
  amount: number;
  address: string;
  city: string;
  zipcode: string;
  phone: string;
  email: string;
  name: string;
  paymentMethod: string;
  pickup?: boolean;
  status?: string;
  /**
   * Hidden orders stay in the database for the business record and are left
   * out of the admin list and every total. Deliberately not a delete.
   */
  hidden?: boolean;
  hiddenAt?: Date;
  /** Stripe's id for the payment, so a webhook can find the order it belongs to. */
  paymentIntentId?: string;
  paidAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
};

declare global {
  var __ccapMongo: Promise<MongoClient> | undefined;
}

function connect(): Promise<MongoClient> {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error(
      "MONGO_URI is not set. Accounts, orders and the admin pages need it.",
    );
  }

  return new MongoClient(uri, {
    // A page that waits on a database that is not answering is a page that
    // times out with a spinner. Better to fail and say so.
    serverSelectionTimeoutMS: 8_000,
  }).connect();
}

export function client(): Promise<MongoClient> {
  globalThis.__ccapMongo ??= connect();
  return globalThis.__ccapMongo;
}

export async function db(): Promise<Db> {
  // The database name comes from the connection string, as it does today.
  return (await client()).db();
}

export async function users(): Promise<Collection<UserDocument>> {
  return (await db()).collection<UserDocument>("users");
}

export async function orders(): Promise<Collection<OrderDocument>> {
  return (await db()).collection<OrderDocument>("orders");
}

/** Whether the database is configured at all, for pages that can say so. */
export function isConfigured(): boolean {
  return Boolean(process.env.MONGO_URI);
}

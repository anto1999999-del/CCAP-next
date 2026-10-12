import "server-only";
import {
  readPinnacleReply,
  type PinnacleOrder,
  type PinnacleOrderType,
  type PinnacleOutcome,
  type PinnacleSettings,
} from "./pinnacle-order";

/**
 * Talking to the supplier's Order API.
 *
 * The only place that knows the address and the login. Everything about what
 * is sent and how a reply is read lives in pinnacle-order, where it can be
 * tested; this file is the network call and the configuration around it.
 *
 * Off unless ORDER_API_ENABLED is exactly "true". The API has no test mode: an
 * order it accepts is a real order in the yard's Pinnacle Pro. So this ships
 * switched off, and is switched on by the owner's decision, not by a deploy.
 */

const DEFAULT_URL = "http://api.carparts-au.com/orderapi";

/**
 * Long enough for a slow answer, short enough that the Stripe webhook this
 * runs inside still replies in time. A send that times out is tried again on
 * Stripe's next delivery, and the API's duplicate check makes that safe.
 */
const TIMEOUT_MS = 10_000;

const ORDER_TYPES: readonly PinnacleOrderType[] = [
  "QUOTE",
  "WORKORDER",
  "INVOICE",
];

export type PinnacleConfig = {
  url: string;
  user: string;
  password: string;
  token?: string;
  settings: Omit<PinnacleSettings, "paymentReference">;
};

/** The configuration, or null when sending is off or the login is missing. */
export function pinnacleConfig(): PinnacleConfig | null {
  if (process.env.ORDER_API_ENABLED?.trim() !== "true") return null;

  const user = process.env.ORDER_API_USER?.trim();
  const password = process.env.ORDER_API_PASSWORD?.trim();
  if (!user || !password) {
    console.error(
      "[pinnacle] ORDER_API_ENABLED is true but the login is not set; not sending.",
    );
    return null;
  }

  const orderType = process.env.ORDER_API_ORDER_TYPE?.trim().toUpperCase();

  return {
    url: (process.env.ORDER_API_URL?.trim() || DEFAULT_URL).replace(/\/+$/, ""),
    user,
    password,
    token: process.env.ORDER_API_TOKEN?.trim() || undefined,
    settings: {
      // An unknown name is filed under "guest" by Pinnacle, not refused.
      salesPerson: process.env.ORDER_API_SALESPERSON?.trim() || "WEBSITE",
      orderType: ORDER_TYPES.find((type) => type === orderType),
      defaultUrgId: process.env.ORDER_API_URG_ID?.trim() || "nw42",
    },
  };
}

export async function sendToPinnacle(
  config: PinnacleConfig,
  order: PinnacleOrder,
): Promise<PinnacleOutcome> {
  // The specification's error 7 asks for the token as a query parameter.
  const address = config.token
    ? `${config.url}/order?token=${encodeURIComponent(config.token)}`
    : `${config.url}/order`;

  try {
    const response = await fetch(address, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${config.user}:${config.password}`).toString("base64")}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(order),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });

    // The body decides, not the status: this API answers 500 for ordinary
    // refusals as well as for faults.
    return readPinnacleReply(await response.text());
  } catch (error) {
    return {
      kind: "unclear",
      message: `no reply: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

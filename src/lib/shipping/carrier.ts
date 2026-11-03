import "server-only";
import { randomUUID } from "node:crypto";
import { nextPickupTime } from "./pickup";
import { statesForPostcode, type AuState } from "./postcode";

/**
 * Freight quotes from Team Global Express.
 *
 * Two things to know before changing anything here.
 *
 * The credentials come from the environment. In the old backend they were
 * written into the source file and committed, so they are in that repository's
 * history and should be treated as exposed.
 *
 * The endpoint is configurable, and it matters which one is set. The old
 * backend hardcoded `api-uat.teamglobalexp.com`, the carrier's user acceptance
 * testing environment, which means the live site has been quoting customers
 * freight prices from a test system. Whether those prices match the production
 * ones is a question for the carrier, not something to guess at here. The
 * default keeps the current behaviour so nothing changes by accident;
 * TGE_RATE_URL switches it.
 */

const RATE_URL =
  process.env.TGE_RATE_URL ??
  "https://api-uat.teamglobalexp.com:6930/gateway/TollMessageRateEnquiryRestService/1.0/tom/rateEnquiry";

/*
  How long one quote may take, across every attempt at it.

  The carrier goes cold when nobody has asked it anything for a while. Measured
  on 3 November 2026: after 20 and 45 minutes idle, the first quote took 23 and
  19 seconds, and every quote after it about 1.5. Requests sent while it was
  waking up, each with its own identifier, hung just the same, so asking again
  does not get an answer any sooner. The only thing that works is waiting for
  the first one.

  This used to give up at 8 seconds and ask again, which on a cold carrier
  failed every time. It was most of the "Call us for a price" on addresses that
  price perfectly well: whoever checked out first after a quiet spell was
  refused, and the next customer, finding the carrier warm, was not.

  28 seconds sits just inside the carrier's own 29-second limit. LiteSpeed gives
  the site 60 seconds to answer, so nothing in front of it cuts in first.
*/
const BUDGET_MS = 28_000;

/** An attempt with less than this left of the budget is not worth starting. */
const MIN_ATTEMPT_MS = 3_000;

/*
  The waits before asking again, after a failure that is worth asking again.

  The carrier throttles requests from one account: asked once and left alone it
  answers in about 1.5 seconds, but eight at once makes every one of them take
  twice as long and roughly one in eight comes back HTTP 500. Retrying that
  immediately asks the same overloaded service the same question inside the
  same moment, and it fails again. Measured on 27 August 2026: spaced out, six
  of six succeeded; in a burst of eight, one failed twice in a row.
*/
const RETRY_DELAYS_MS = [500, 1_500];

/**
 * Limits the current site learned from the carrier the hard way, and they are
 * not in any documentation we hold.
 *
 * The carrier gives up on its own side at about 29 seconds, and a long list of
 * item rows is what pushes it there: sending each unit as its own row returned
 * HTTP 408. So a line carries up to 99 of the same part, and a shipment carries
 * at most 75 lines, with anything beyond that rolled into one approximate line.
 */
const MAX_QUANTITY_PER_LINE = 99;
const MAX_LINES = 75;

/**
 * Quotes are remembered for two minutes, as they are on the current site.
 *
 * The same cart to the same address is the same price, and this runs while
 * somebody edits a form: without it, correcting a typo in a suburb costs
 * another two-second wait and another call to a paid service.
 */
const CACHE_TTL_MS = 120_000;

const cache = new Map<string, { quote: FreightQuote; expires: number }>();

/** The yard, as the carrier knows it. */
const CONSIGNOR = {
  suburb: "Gosford",
  state: "NSW",
  postcode: "2250",
} as const;

const ACCOUNT_CODE = process.env.TGE_ACCOUNT_CODE ?? "80207215";

export type ShipmentItem = {
  quantity: number;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  volumeM3: number;
};

export type Destination = {
  suburb: string;
  postcode: string;
};

export type FreightQuote = {
  /** Cents, excluding GST. */
  freightCents: number;
  /** Cents of GST. */
  taxCents: number;
  /** Cents, including GST. What the customer pays for delivery. */
  totalCents: number;
};

/**
 * Why a quote did not come back.
 *
 * - `address`: the carrier does not recognise the suburb, postcode and state
 *   together. Only the customer can fix that, so they are told so.
 * - `refused`: the carrier understood the question and will not answer it: a
 *   dimension with a decimal point, a weekend pickup date, a rate it will not
 *   give online. Asking again gets the same answer.
 * - `unavailable`: no usable answer at all, such as a timeout or a gateway
 *   error. Worth asking again.
 */
export type FreightFailure = "address" | "refused" | "unavailable";

export class FreightQuoteError extends Error {
  constructor(
    readonly failure: FreightFailure,
    /** The carrier's own code, such as E-ENQ-00053, when it gave one. */
    readonly code: string | null,
    message: string,
  ) {
    super(message);
    this.name = "FreightQuoteError";
  }
}

/** True when the customer's suburb and postcode are what the carrier refused. */
export function isAddressRejection(error: unknown): boolean {
  return error instanceof FreightQuoteError && error.failure === "address";
}

/*
  Carrier codes that are not worth asking again about are the default. These
  are the exceptions.

  E-ENQ-00053 is the suburb, postcode and state combination. E-ENQ-00006 ("UPS
  response is null") is the carrier's own upstream failing to answer it, seen
  once in the old backend's log, and is the carrier's problem rather than the
  question's.
*/
const ADDRESS_CODES = new Set(["E-ENQ-00053"]);
const TRANSIENT_CODES = new Set(["E-ENQ-00006"]);

type CarrierErrorBody = {
  TollMessage?: {
    ErrorMessages?: {
      ErrorMessage?:
        | { ErrorNumber?: { Value?: string }; ErrorMessage?: string }
        | { ErrorNumber?: { Value?: string }; ErrorMessage?: string }[];
    };
  };
};

/**
 * Sort a refused request into the three kinds of failure, from its status and
 * body.
 *
 * The carrier answers almost every refusal with HTTP 500 and explains itself in
 * the body, so the status alone says nothing. The body used to be thrown away,
 * which left the logs saying "HTTP 500" for a misspelt suburb, a cold carrier
 * and our own bug alike, and made them impossible to tell apart.
 */
export function classifyRefusal(
  status: number,
  body: string,
): FreightQuoteError {
  let code: string | null = null;
  let explanation = "";

  try {
    const parsed = JSON.parse(body) as CarrierErrorBody;
    const messages = parsed.TollMessage?.ErrorMessages?.ErrorMessage;
    const first = Array.isArray(messages) ? messages[0] : messages;
    code = first?.ErrorNumber?.Value?.trim() || null;
    explanation = first?.ErrorMessage ?? "";
  } catch {
    // A gateway error page rather than the carrier's JSON.
    explanation = body;
  }

  // The carrier includes Java stack traces; the first line is the message.
  const summary = explanation.split(/\r?\n/)[0].trim().slice(0, 200);
  const message = `HTTP ${status}${code ? ` ${code}` : ""}${summary ? `: ${summary}` : ""}`;

  let failure: FreightFailure;
  if (code && ADDRESS_CODES.has(code)) failure = "address";
  else if (code && TRANSIENT_CODES.has(code)) failure = "unavailable";
  else if (code) failure = "refused";
  // Credentials or a malformed request: the same request fails the same way.
  else if (status >= 400 && status < 500 && status !== 408 && status !== 429)
    failure = "refused";
  /*
    A 5xx with no code is a gateway timeout, an outage, or the carrier refusing
    a reused message identifier. That last one was this file's own bug, and a
    fresh identifier on the next attempt is the cure, so it is retried too.
  */
  else failure = "unavailable";

  return new FreightQuoteError(failure, code, message);
}

function credentials(): string {
  const user = process.env.TGE_USERNAME;
  const password = process.env.TGE_PASSWORD;
  if (!user || !password) {
    throw new Error(
      "TGE_USERNAME and TGE_PASSWORD must be set to quote freight.",
    );
  }
  return Buffer.from(`${user}:${password}`).toString("base64");
}

const toCents = (amount: unknown): number => {
  const value = Number(amount);
  return Number.isFinite(value) && value > 0 ? Math.round(value * 100) : 0;
};

type RateResponse = {
  TotalChargeAmount?: { Value?: number | string };
  TotalAmount?: { Value?: number | string };
  GSTAmount?: { Value?: number | string };
  TaxAmount?: { Value?: number | string };
  FreightCharge?: { Value?: number | string };
  FreightChargeAmount?: { Value?: number | string };
  BaseAmount?: { Value?: number | string };
};

/**
 * Read the charge out of the carrier's answer.
 *
 * It does not always fill the same fields, so this works from the total down:
 * total minus tax where a total is given, then the freight charge, then the
 * base amount. Everything is converted to whole cents here, at the boundary, so
 * nothing downstream does arithmetic on the carrier's decimals.
 */
export function readCharges(response: RateResponse): FreightQuote {
  const taxCents = toCents(
    response.GSTAmount?.Value ?? response.TaxAmount?.Value,
  );
  const totalCents = toCents(
    response.TotalChargeAmount?.Value ?? response.TotalAmount?.Value,
  );

  let freightCents = totalCents > 0 ? Math.max(0, totalCents - taxCents) : 0;
  if (freightCents === 0) {
    freightCents =
      toCents(
        response.FreightCharge?.Value ?? response.FreightChargeAmount?.Value,
      ) || toCents(response.BaseAmount?.Value);
  }

  return {
    freightCents,
    taxCents,
    totalCents: totalCents > 0 ? totalCents : freightCents + taxCents,
  };
}

/** Split a line of more than 99 into several, and cap the total line count. */
function ratingLines(items: readonly ShipmentItem[]): ShipmentItem[] {
  const lines: ShipmentItem[] = [];

  for (const item of items) {
    let remaining = Math.max(1, item.quantity);
    while (remaining > 0) {
      const quantity = Math.min(remaining, MAX_QUANTITY_PER_LINE);
      lines.push({ ...item, quantity });
      remaining -= quantity;
    }
  }

  if (lines.length <= MAX_LINES) return lines;

  /*
    Everything past the cap becomes one line: the summed weight and volume, and
    the largest of each dimension. Approximate on purpose. The alternative is a
    request the carrier refuses to answer at all.
  */
  const kept = lines.slice(0, MAX_LINES - 1);
  const rest = lines.slice(MAX_LINES - 1);

  kept.push(
    rest.reduce<ShipmentItem>(
      (merged, line) => ({
        quantity: 1,
        weightKg: merged.weightKg + line.weightKg * line.quantity,
        volumeM3: merged.volumeM3 + line.volumeM3 * line.quantity,
        lengthCm: Math.max(merged.lengthCm, line.lengthCm),
        widthCm: Math.max(merged.widthCm, line.widthCm),
        heightCm: Math.max(merged.heightCm, line.heightCm),
      }),
      {
        quantity: 1,
        weightKg: 0,
        volumeM3: 0,
        lengthCm: 1,
        widthCm: 1,
        heightCm: 1,
      },
    ),
  );

  return kept;
}

/*
  Whole centimetres, rounded up. The carrier refuses a length or height with a
  decimal point (E-ENQ-00069), and the measured table has a few: a coil pack is
  7.13 cm high, a fuel door 70.5 cm long. Every one of those parts, 39 priced
  ones in November 2026, could not be quoted to any address. Rounding up keeps
  any error on the yard's side; volume and weight keep their decimals, which
  the carrier accepts.
*/
const wholeCm = (cm: number) => Math.max(0, Math.ceil(cm));

export function itemNodes(items: readonly ShipmentItem[]) {
  return items.map((item) => ({
    Commodity: { CommodityCode: "Z", CommodityDescription: "ALL FREIGHT" },
    ShipmentItemTotals: {
      ShipmentItemCount: String(Math.max(1, item.quantity)),
    },
    Dimensions: {
      Width: String(wholeCm(item.widthCm)),
      Length: String(wholeCm(item.lengthCm)),
      Height: String(wholeCm(item.heightCm)),
      // The carrier rejects a zero, so the floor is the smallest it accepts.
      Volume: String(Math.max(0.001, item.volumeM3)),
      Weight: String(Math.max(0.001, item.weightKg)),
    },
  }));
}

/**
 * One rate enquiry, ready to send.
 *
 * Built afresh for every attempt, never reused. The carrier refuses a message
 * identifier it has already seen ("needs to be unique"), with an HTTP 500, even
 * when the first request succeeded or was abandoned. When this was built once
 * outside the retry loop, every second and third attempt was refused that way,
 * so retrying could never work.
 */
function rateEnquiry(
  destination: Destination,
  state: AuState,
  lines: readonly ShipmentItem[],
) {
  return {
    TollMessage: {
      Header: {
        MessageVersion: "1.0",
        MessageIdentifier: randomUUID(),
        CreateTimestamp: new Date().toISOString(),
        DocumentType: "RateEnquiry",
        Environment: "MYTGE_PS",
        SourceSystemCode: "CCAUTOPARTS",
        MessageSender: "CCAUTOPARTS",
        MessageReceiver: "TOLL",
      },
      RateEnquiry: {
        Request: {
          BusinessID: "IPEC",
          SystemFields: { PickupDateTime: nextPickupTime() },
          ShipmentService: { ServiceCode: "X", ShipmentProductCode: "" },
          ShipmentFlags: { ExtraServiceFlag: "False" },
          BillToParty: { AccountCode: ACCOUNT_CODE },
          ConsignorParty: {
            PhysicalAddress: {
              Suburb: CONSIGNOR.suburb,
              StateCode: CONSIGNOR.state,
              PostalCode: CONSIGNOR.postcode,
              CountryCode: "AU",
            },
          },
          ConsigneeParty: {
            PhysicalAddress: {
              Suburb: destination.suburb,
              StateCode: state,
              PostalCode: destination.postcode,
              CountryCode: "AU",
            },
          },
          ShipmentItems: { ShipmentItem: itemNodes(lines) },
        },
      },
    },
  };
}

/** Ask once, and either return a real price or throw a FreightQuoteError. */
async function askCarrier(
  enquiry: ReturnType<typeof rateEnquiry>,
  authorization: string,
  timeoutMs: number,
): Promise<FreightQuote> {
  let response: Response;
  try {
    response = await fetch(RATE_URL, {
      method: "POST",
      headers: { "content-type": "application/json", authorization },
      body: JSON.stringify(enquiry),
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    throw new FreightQuoteError(
      "unavailable",
      null,
      timedOut
        ? `no answer within ${Math.round(timeoutMs / 1000)}s`
        : `could not reach the carrier: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (!response.ok) {
    throw classifyRefusal(response.status, await response.text());
  }

  let body: { TollMessage?: { RateEnquiry?: { Response?: RateResponse } } };
  try {
    body = await response.json();
  } catch {
    throw new FreightQuoteError("unavailable", null, "unreadable answer");
  }

  /*
    Sometimes an array of quotes rather than one. The old backend handled
    this and it is not documented anywhere else, so it is handled here too.
  */
  const answer = body.TollMessage?.RateEnquiry?.Response;
  const quote = readCharges((Array.isArray(answer) ? answer[0] : answer) ?? {});

  /*
    A zero is not a price. Returned as one, the checkout printed "Delivery
    $0.00" and a confident total, so it is treated as no answer and asked again.
  */
  if (quote.totalCents <= 0) {
    throw new FreightQuoteError("unavailable", null, "answer had no charge");
  }

  return quote;
}

const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export async function quoteFreight({
  destination,
  items,
  context = "freight",
}: {
  destination: Destination;
  items: readonly ShipmentItem[];
  /**
   * Who asked, for the log line: "checkout", "payment" and so on. The lines
   * keep the old "[checkout] freight quote failed" wording, which is what
   * people already search the journal for.
   */
  context?: string;
}): Promise<FreightQuote> {
  const lines = ratingLines(items);

  const key = [
    destination.suburb.trim().toLowerCase(),
    destination.postcode.trim(),
    ...lines.map(
      (line) =>
        `${line.quantity}:${line.weightKg}:${line.lengthCm}x${line.widthCm}x${line.heightCm}`,
    ),
  ].join("|");

  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.quote;

  const authorization = `Basic ${credentials()}`;
  const where = `${destination.suburb} ${destination.postcode}`;
  const started = Date.now();
  const elapsed = () => Date.now() - started;

  /*
    Most postcodes are in one state. A few straddle a border, and the carrier
    checks the three together, so an address refusal moves on to the next
    state before it is believed.
  */
  const states = statesForPostcode(destination.postcode);
  let stateIndex = 0;
  let retries = 0;
  let attempts = 0;
  let failure: FreightQuoteError;

  for (;;) {
    attempts += 1;

    try {
      const quote = await askCarrier(
        rateEnquiry(destination, states[stateIndex], lines),
        authorization,
        BUDGET_MS - elapsed(),
      );

      cache.set(key, { quote, expires: Date.now() + CACHE_TTL_MS });
      // Successes are logged too, so the failures have something to be
      // counted against.
      console.info(
        `[${context}] freight quoted for ${where}: $${(quote.totalCents / 100).toFixed(2)} (attempt ${attempts}, ${elapsed()}ms)`,
      );
      return quote;
    } catch (error) {
      failure =
        error instanceof FreightQuoteError
          ? error
          : new FreightQuoteError("unavailable", null, String(error));
    }

    const enoughTime = BUDGET_MS - elapsed() >= MIN_ATTEMPT_MS;

    if (
      failure.failure === "address" &&
      stateIndex + 1 < states.length &&
      enoughTime
    ) {
      stateIndex += 1;
      continue;
    }

    const wait = RETRY_DELAYS_MS[retries];
    if (
      failure.failure !== "unavailable" ||
      wait === undefined ||
      BUDGET_MS - elapsed() - wait < MIN_ATTEMPT_MS
    ) {
      break;
    }

    retries += 1;
    await sleep(wait);
  }

  console.error(
    `[${context}] freight quote failed for ${where}: ${failure.message} (${failure.failure}, ${attempts} ${attempts === 1 ? "attempt" : "attempts"}, ${elapsed()}ms)`,
  );
  throw failure;
}

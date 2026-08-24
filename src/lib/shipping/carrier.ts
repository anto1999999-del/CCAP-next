import "server-only";
import { randomUUID } from "node:crypto";
import { nextPickupTime } from "./pickup";
import { stateFromPostcode } from "./postcode";

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

const TIMEOUT_MS = 20_000;

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

function itemNodes(items: readonly ShipmentItem[]) {
  return items.map((item) => ({
    Commodity: { CommodityCode: "Z", CommodityDescription: "ALL FREIGHT" },
    ShipmentItemTotals: {
      ShipmentItemCount: String(Math.max(1, item.quantity)),
    },
    Dimensions: {
      Width: String(Math.max(0, item.widthCm)),
      Length: String(Math.max(0, item.lengthCm)),
      Height: String(Math.max(0, item.heightCm)),
      // The carrier rejects a zero, so the floor is the smallest it accepts.
      Volume: String(Math.max(0.001, item.volumeM3)),
      Weight: String(Math.max(0.001, item.weightKg)),
    },
  }));
}

export async function quoteFreight({
  destination,
  items,
}: {
  destination: Destination;
  items: readonly ShipmentItem[];
}): Promise<FreightQuote> {
  const payload = {
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
              StateCode: stateFromPostcode(destination.postcode) ?? "NSW",
              PostalCode: destination.postcode,
              CountryCode: "AU",
            },
          },
          ShipmentItems: { ShipmentItem: itemNodes(items) },
        },
      },
    },
  };

  const response = await fetch(RATE_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Basic ${credentials()}`,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Freight quote failed: HTTP ${response.status}`);
  }

  const body = (await response.json()) as {
    TollMessage?: { RateEnquiry?: { Response?: RateResponse } };
  };

  return readCharges(body.TollMessage?.RateEnquiry?.Response ?? {});
}

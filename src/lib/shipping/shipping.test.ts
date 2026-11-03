import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  classifyRefusal,
  isAddressRejection,
  itemNodes,
  quoteFreight,
  readCharges,
  type FreightQuoteError,
} from "./carrier";
import {
  ASSUMED_PROFILE,
  lookupShippingProfile,
  profileCount,
  shippingProfileFor,
  volumeM3,
} from "./dimensions";
import { nextPickupTime } from "./pickup";
import { stateFromPostcode, statesForPostcode } from "./postcode";

/**
 * The freight rules.
 *
 * Getting these wrong quotes the wrong price to a customer, and the yard wears
 * the difference, so they are checked rather than trusted.
 *
 *   npm test
 */

test("postcodes map to the state the carrier expects", () => {
  expect(stateFromPostcode("2261")).toEqual("NSW"); // Berkeley Vale
  expect(stateFromPostcode("3000")).toEqual("VIC");
  expect(stateFromPostcode("4000")).toEqual("QLD");
  expect(stateFromPostcode("6000")).toEqual("WA");
  expect(stateFromPostcode("7000")).toEqual("TAS");
});

test("the territories are read out of the ranges that surround them", () => {
  // Canberra sits inside the NSW range, Darwin is written with a leading zero.
  expect(stateFromPostcode("2601")).toEqual("ACT");
  expect(stateFromPostcode("2914")).toEqual("ACT");
  expect(stateFromPostcode("2620")).toEqual("NSW");
  expect(stateFromPostcode("0800")).toEqual("NT");
  expect(stateFromPostcode("800")).toEqual("NT");
});

test("nonsense postcodes have no state rather than a wrong one", () => {
  expect(stateFromPostcode("")).toEqual(null);
  expect(stateFromPostcode("ab")).toEqual(null);
  expect(stateFromPostcode("0000")).toEqual(null);
});

test("a part's dimensions are found from its type code", () => {
  const profile = lookupShippingProfile({
    itemTypeCode: "A_C_COMPRESSOR",
    icDesc: null,
    itemName: "A/C Compressor",
  });

  expect(profile).toEqual({
    weightKg: 8,
    lengthCm: 23,
    widthCm: 24,
    heightCm: 19,
  });
});

test("dimensions are found when the wording differs from the table", () => {
  // The yard types these three fields by hand, so none of them is exact.
  const profile = lookupShippingProfile({
    itemTypeCode: "TRANS_GEARBOX",
    icDesc: "AUTO, 6 SPEED, PETROL, 2.0",
    itemName: "Trans/Gearbox",
  });

  expect(profile).not.toEqual(null);
  expect(profile!.weightKg).toBeGreaterThan(0);
});

test("a part nothing matches has no dimensions rather than made-up ones", () => {
  const profile = lookupShippingProfile({
    itemTypeCode: "ZZZ_NOT_A_PART",
    icDesc: null,
    itemName: "Qq",
  });

  expect(profile).toEqual(null);
});

test("the measured table came across whole", () => {
  expect(profileCount()).toEqual(257);
});

test("volume is in cubic metres", () => {
  expect(
    volumeM3({ weightKg: 1, lengthCm: 100, widthCm: 100, heightCm: 100 }),
  ).toEqual(1);
});

test("pickup never falls on a day the yard is shut", () => {
  // A Saturday, so the lead time lands on the weekend.
  const saturday = new Date("2026-08-22T00:00:00Z");
  expect(nextPickupTime(saturday).slice(0, 10)).toEqual("2026-08-24");

  // The Monday holiday already in the calendar pushes it to the Tuesday.
  const beforeHoliday = new Date("2026-04-26T00:00:00Z");
  expect(nextPickupTime(beforeHoliday).slice(0, 10)).toEqual("2026-04-28");
});

test("pickup is sent with an explicit offset, not as bare local time", () => {
  expect(nextPickupTime(new Date("2026-08-19T00:00:00Z"))).toMatch(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+10:00$/,
  );
});

test("the carrier's charge is read from the total, in cents", () => {
  expect(
    readCharges({
      TotalChargeAmount: { Value: 121.55 },
      GSTAmount: { Value: 11.05 },
    }),
  ).toEqual({ freightCents: 11050, taxCents: 1105, totalCents: 12155 });
});

test("a charge is still read when the carrier fills different fields", () => {
  expect(readCharges({ FreightCharge: { Value: 88 } })).toEqual({
    freightCents: 8800,
    taxCents: 0,
    totalCents: 8800,
  });

  expect(readCharges({ BaseAmount: { Value: "45.50" } })).toEqual({
    freightCents: 4550,
    taxCents: 0,
    totalCents: 4550,
  });
});

test("an empty answer is zero, not a guess", () => {
  expect(readCharges({})).toEqual({
    freightCents: 0,
    taxCents: 0,
    totalCents: 0,
  });
});

test("a part measured by position is found from its plain name", () => {
  /*
    The yard measured "HEADREST RH REAR" and "CALIPER RH REAR"; the catalogue
    calls them HEADREST and CALIPER. Matching only one way missed 4,542 parts,
    which were then quoted as though they weighed a kilogram.
  */
  for (const code of ["HEADREST", "CALIPER", "ABS_SENSOR", "FRONT_SEAT"]) {
    const profile = lookupShippingProfile({
      itemTypeCode: code,
      icDesc: null,
      itemName: code,
    });

    expect(profile, `${code} should find a measured profile`).not.toEqual(null);
    expect(profile!.weightKg).toBeGreaterThan(0);
  }
});

test("an unmeasured part is assumed heavy, not light", () => {
  const unknown = {
    itemTypeCode: "ZZZ_NOT_A_PART",
    icDesc: null,
    itemName: "Qq",
  };

  const { profile, measured } = shippingProfileFor(unknown);

  expect(measured).toEqual(false);
  expect(profile).toEqual(ASSUMED_PROFILE);
  // The error has to fall on the yard's side of the ledger, not the customer's.
  expect(profile.weightKg).toBeGreaterThanOrEqual(15);
});

test("a postcode shared across a border is tried in both states", () => {
  // Tharwa ACT and Queanbeyan NSW are both 2620; the carrier checks the pair.
  expect(statesForPostcode("2620")).toEqual(["NSW", "ACT"]);
  // The carrier prices Wallaroo NSW 2618 as ACT, so it needs no second try.
  expect(statesForPostcode("2618")).toEqual(["ACT"]);
  expect(statesForPostcode("2250")).toEqual(["NSW"]);
  // Unknown postcodes go as NSW, as they always have, for the carrier to judge.
  expect(statesForPostcode("")).toEqual(["NSW"]);
});

test("pickup skips the NSW public holidays", () => {
  // Christmas Eve 2026 is a Thursday; Christmas, the weekend and the Boxing
  // Day holiday follow it.
  expect(nextPickupTime(new Date("2026-12-24T23:00:00Z")).slice(0, 10)).toEqual(
    "2026-12-29",
  );
  // The Thursday before Good Friday 2027 lands on Easter Tuesday.
  expect(nextPickupTime(new Date("2027-03-25T23:00:00Z")).slice(0, 10)).toEqual(
    "2027-03-30",
  );
});

test("dimensions go to the carrier in whole centimetres, rounded up", () => {
  // A coil pack: the carrier refuses 7.13 as a height (E-ENQ-00069).
  const [node] = itemNodes([
    {
      quantity: 1,
      weightKg: 2.5,
      lengthCm: 25,
      widthCm: 24.2,
      heightCm: 7.13,
      volumeM3: 0.004,
    },
  ]);

  expect(node.Dimensions).toMatchObject({
    Length: "25",
    Width: "25",
    Height: "8",
    Weight: "2.5",
  });
});

const carrierError = (code: string, message: string) =>
  JSON.stringify({
    TollMessage: {
      ErrorMessages: {
        ErrorMessage: [{ ErrorNumber: { Value: code }, ErrorMessage: message }],
      },
    },
  });

test("the carrier's refusals are told apart by their code", () => {
  const address = classifyRefusal(
    500,
    carrierError(
      "E-ENQ-00053",
      "Suburb,post code and state combination is invalid.",
    ),
  );
  expect(address.failure).toEqual("address");
  expect(address.code).toEqual("E-ENQ-00053");
  expect(address.message).toContain("combination is invalid");

  expect(
    classifyRefusal(
      500,
      carrierError("E-ENQ-00069", "Length/Height cannot be in decimal."),
    ).failure,
  ).toEqual("refused");

  // The carrier's own upstream not answering is worth asking again.
  expect(
    classifyRefusal(
      500,
      carrierError("E-ENQ-00006", "UPS response is null."),
    ).failure,
  ).toEqual("unavailable");
});

test("a refusal with no code is worth asking again", () => {
  // A gateway page, not the carrier's JSON.
  expect(
    classifyRefusal(504, "Server Error: Gateway Timeout").failure,
  ).toEqual("unavailable");

  // A reused message identifier, which a fresh one cures.
  expect(
    classifyRefusal(
      500,
      JSON.stringify({
        TollMessage: {
          ErrorMessages: {
            ErrorMessage: [
              { ErrorMessage: "MessengeIdentifier(x) already exists" },
            ],
          },
        },
      }),
    ).failure,
  ).toEqual("unavailable");

  // Bad credentials do not get better by repetition.
  expect(classifyRefusal(401, "Unauthorized").failure).toEqual("refused");
});

test("a stack trace from the carrier is cut to its first line", () => {
  const error = classifyRefusal(
    500,
    carrierError(
      "E-ENQ-00013",
      "java.lang.NullPointerException\n\tat com.mytoll.Validator.getServiceCode",
    ),
  );
  expect(error.message).toEqual(
    "HTTP 500 E-ENQ-00013: java.lang.NullPointerException",
  );
});

/*
  quoteFreight against a stand-in carrier. Each test uses its own suburb,
  because quotes are cached by destination for two minutes.
*/

const priced = (total: number) =>
  new Response(
    JSON.stringify({
      TollMessage: {
        RateEnquiry: {
          Response: {
            TotalChargeAmount: { Value: total },
            GSTAmount: { Value: total > 0 ? 1 : 0 },
          },
        },
      },
    }),
    { status: 200 },
  );

const box = {
  quantity: 1,
  weightKg: 15,
  lengthCm: 60,
  widthCm: 45,
  heightCm: 40,
  volumeM3: 0.108,
};

type SentEnquiry = {
  TollMessage: {
    Header: { MessageIdentifier: string };
    RateEnquiry: {
      Request: {
        ConsigneeParty: { PhysicalAddress: { StateCode: string } };
      };
    };
  };
};

function carrier(...answers: (() => Response)[]) {
  const sent: SentEnquiry[] = [];
  const fetch = vi.fn(async (_url: string, init: RequestInit) => {
    sent.push(JSON.parse(String(init.body)) as SentEnquiry);
    const next = answers[sent.length - 1];
    if (!next) throw new Error("the carrier was asked more often than expected");
    return next();
  });
  vi.stubGlobal("fetch", fetch);
  return sent;
}

beforeEach(() => {
  vi.stubEnv("TGE_USERNAME", "test");
  vi.stubEnv("TGE_PASSWORD", "test");
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

test("every attempt carries its own message identifier", async () => {
  // The carrier refuses an identifier it has seen; reusing one made every
  // retry fail, which is what turned one slow answer into "call us".
  const sent = carrier(
    () => new Response("Gateway Timeout", { status: 504 }),
    () => new Response("Gateway Timeout", { status: 504 }),
    () => priced(25.02),
  );

  const quote = await quoteFreight({
    destination: { suburb: "Newcastle", postcode: "2300" },
    items: [box],
  });

  expect(quote.totalCents).toEqual(2502);
  const ids = sent.map((enquiry) => enquiry.TollMessage.Header.MessageIdentifier);
  expect(ids).toHaveLength(3);
  expect(new Set(ids).size).toEqual(3);
});

test("a refused address is not asked about again", async () => {
  const sent = carrier(
    () =>
      new Response(carrierError("E-ENQ-00053", "combination is invalid"), {
        status: 500,
      }),
  );

  const error = await quoteFreight({
    destination: { suburb: "Saint Ives", postcode: "2075" },
    items: [box],
  }).catch((caught: FreightQuoteError) => caught);

  expect(sent).toHaveLength(1);
  expect(isAddressRejection(error)).toEqual(true);
});

test("a refusal that would only repeat is not retried", async () => {
  const sent = carrier(
    () =>
      new Response(carrierError("E-ENQ-00069", "cannot be in decimal"), {
        status: 500,
      }),
  );

  const error = await quoteFreight({
    destination: { suburb: "Wyong", postcode: "2259" },
    items: [box],
  }).catch((caught: FreightQuoteError) => caught);

  expect(sent).toHaveLength(1);
  expect((error as FreightQuoteError).failure).toEqual("refused");
});

test("a border postcode is tried in its other state before it is refused", async () => {
  const sent = carrier(
    () =>
      new Response(carrierError("E-ENQ-00053", "combination is invalid"), {
        status: 500,
      }),
    () => priced(48.76),
  );

  const quote = await quoteFreight({
    destination: { suburb: "Tharwa", postcode: "2620" },
    items: [box],
  });

  expect(quote.totalCents).toEqual(4876);
  expect(
    sent.map(
      (enquiry) =>
        enquiry.TollMessage.RateEnquiry.Request.ConsigneeParty.PhysicalAddress
          .StateCode,
    ),
  ).toEqual(["NSW", "ACT"]);
});

test("an answer of zero is asked again rather than charged", async () => {
  const sent = carrier(
    () => priced(0),
    () => priced(30.15),
  );

  const quote = await quoteFreight({
    destination: { suburb: "Banksmeadow", postcode: "2019" },
    items: [box],
  });

  expect(sent).toHaveLength(2);
  expect(quote.totalCents).toEqual(3015);
});

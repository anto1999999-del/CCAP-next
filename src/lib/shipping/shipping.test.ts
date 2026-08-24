import { expect, test } from "vitest";
import { readCharges } from "./carrier";
import { lookupShippingProfile, profileCount, volumeM3 } from "./dimensions";
import { nextPickupTime } from "./pickup";
import { stateFromPostcode } from "./postcode";

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

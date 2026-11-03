import { describe, expect, it } from "vitest";
import {
  MAX_NOTES,
  NO_DETAILS,
  detailsComplete,
  fullName,
  splitName,
  type BillingDetails,
} from "./details";

const filled: BillingDetails = {
  ...NO_DETAILS,
  firstName: "Jane",
  lastName: "Citizen",
  address: "12 Sample Street",
  suburb: "Gosford",
  state: "NSW",
  postcode: "2250",
  phone: "0400 000 000",
  email: "jane@example.com",
};

describe("a name", () => {
  it("is split at the first space to prefill the form", () => {
    expect(splitName("Jane Citizen")).toEqual({
      firstName: "Jane",
      lastName: "Citizen",
    });
    expect(splitName("  Mary Jane  Van Der Berg ")).toEqual({
      firstName: "Mary",
      lastName: "Jane Van Der Berg",
    });
  });

  it("leaves the last name for the customer when there is only one", () => {
    expect(splitName("admin")).toEqual({ firstName: "admin", lastName: "" });
    expect(splitName("")).toEqual({ firstName: "", lastName: "" });
  });

  it("is joined back together for the order", () => {
    expect(fullName({ firstName: " Jane ", lastName: " Citizen " })).toBe(
      "Jane Citizen",
    );
  });
});

describe("the form", () => {
  it("is complete with every required field and neither optional one", () => {
    expect(detailsComplete(filled)).toBe(true);
  });

  it.each([
    "firstName",
    "lastName",
    "address",
    "suburb",
    "state",
    "postcode",
    "phone",
    "email",
  ] as const)("is not complete without %s", (field) => {
    expect(detailsComplete({ ...filled, [field]: "" })).toBe(false);
  });

  it("refuses a state that is not an Australian one", () => {
    expect(detailsComplete({ ...filled, state: "Auckland" })).toBe(false);
  });

  it("refuses notes too long to save", () => {
    expect(
      detailsComplete({ ...filled, notes: "x".repeat(MAX_NOTES + 1) }),
    ).toBe(false);
  });
});

/**
 * What the checkout asks a customer for, and when that is enough to continue.
 *
 * The fields, their order and their wording are the owner's, sent in November
 * 2026. Every address field stays required on a pickup too, because Pinnacle
 * records the customer's own address against the sale, and the old checkout
 * filled it with the yard's address on a pickup, which left the yard listed as
 * its own customer.
 */

export const AU_STATES = [
  "ACT",
  "NSW",
  "NT",
  "QLD",
  "SA",
  "TAS",
  "VIC",
  "WA",
] as const;

export type AuState = (typeof AU_STATES)[number];

export type BillingDetails = {
  firstName: string;
  lastName: string;
  company: string;
  address: string;
  address2: string;
  suburb: string;
  /** Empty until chosen: a default would quietly mislabel interstate orders. */
  state: string;
  postcode: string;
  phone: string;
  email: string;
  notes: string;
};

export const NO_DETAILS: BillingDetails = {
  firstName: "",
  lastName: "",
  company: "",
  address: "",
  address2: "",
  suburb: "",
  state: "",
  postcode: "",
  phone: "",
  email: "",
  notes: "",
};

/** Long enough for gate codes and directions, short enough to read on a label. */
export const MAX_NOTES = 500;

export function fullName(
  details: Pick<BillingDetails, "firstName" | "lastName">,
): string {
  return `${details.firstName.trim()} ${details.lastName.trim()}`.trim();
}

/**
 * An account holds one name, so it is split at the first space to prefill the
 * form. A wrong split is harmless: the customer can see it and fix it, and the
 * two halves are joined again when the order is written.
 */
export function splitName(name: string): {
  firstName: string;
  lastName: string;
} {
  const [firstName = "", ...rest] = name.trim().split(/\s+/);
  return { firstName, lastName: rest.join(" ") };
}

function isAuState(value: string): value is AuState {
  return (AU_STATES as readonly string[]).includes(value);
}

/** Whether every required field holds something worth sending. */
export function detailsComplete(details: BillingDetails): boolean {
  return (
    details.firstName.trim().length > 0 &&
    details.lastName.trim().length > 0 &&
    details.address.trim().length > 3 &&
    details.suburb.trim().length > 1 &&
    isAuState(details.state) &&
    /^\d{3,4}$/.test(details.postcode.trim()) &&
    details.phone.trim().length > 5 &&
    details.email.includes("@") &&
    details.notes.length <= MAX_NOTES
  );
}

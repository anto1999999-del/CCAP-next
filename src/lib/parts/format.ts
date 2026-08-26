import type { CatalogPart } from "./types";

/**
 * Turning supplier fields into something a customer can read.
 *
 * The catalogue is written for a wrecking yard's stock system: "Pwr Dr Wind
 * Switch", odometers as bare digits, years as an interchange list. None of that
 * is wrong, but none of it belongs on a page as it stands.
 */

/** Shown where the supplier recorded nothing. */
export const NOT_RECORDED = "N/A";

/**
 * Words that are initialisms rather than words, so title casing must leave them
 * alone. Without this the page offers a "Cd Player" and an "Abs Module".
 */
const INITIALISMS = new Set([
  "cd", "dvd", "sat", "tv", "ecu", "bcm", "abs", "ac",
  "4wd", "awd", "fwd", "rwd", "oem", "lhd", "rhd", "led",
  "hid", "usb", "aux", "am", "fm", "gps", "hev",
]);

export function orNotRecorded(value: unknown): string {
  const text = value == null ? "" : String(value).trim();
  return text === "" ? NOT_RECORDED : text;
}

/** "Pwr Dr Wind Switch" from "PWR_DR_WIND_SWITCH". */
export function formatItemName(raw: string | null): string {
  if (!raw) return "Used Auto Part";

  return raw
    .replace(/[/_]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      const lower = word.toLowerCase();
      if (INITIALISMS.has(lower)) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

/** "184,000 Kms", from whatever the yard typed into the field. */
export function formatOdometer(raw: unknown): string {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (!digits) return NOT_RECORDED;
  return `${Number(digits).toLocaleString("en-AU")} Kms`;
}

/**
 * Every year this part fits, not just the year of the car it came off. That
 * list is the answer to the question the customer is actually asking.
 */
export function yearLabel(part: CatalogPart): string {
  const years = part.longIcYear ?? [];
  if (years.length > 0) return years.map(String).join(", ");
  return orNotRecorded(part.year);
}

export function descriptionText(part: CatalogPart): string {
  return part.icDesc?.trim() || "";
}

/**
 * "2015 Toyota Hilux", the way somebody would search for it.
 *
 * The year is the first of the fitment range rather than the build year: a
 * gearbox off a 2021 Cerato fits a 2018 and is worth finding under both.
 *
 * This lives here, beside `formatItemName`, because the page title is built
 * from the two of them and so is the check for pages whose titles collide. When
 * they were in different files the check compared the raw fields instead, and
 * missed every pair that differed in build year but shared a fitment range.
 */
export function vehicleLabel(part: CatalogPart): string {
  const make = part.manufacturer?.trim();
  const model = part.model?.trim();
  const years = part.longIcYear ?? [];
  const year = years.length > 0 ? String(years[0]) : (part.year ?? "");

  return [year, make, model].filter(Boolean).join(" ");
}

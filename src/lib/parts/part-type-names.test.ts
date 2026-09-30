import { describe, expect, it } from "vitest";
import { matchPartTypes, partTypeLabel } from "./part-type-names";

/**
 * What a customer reads in the part type filter, and what they find when they
 * type into it. The codes are real ones from the supplier's feed.
 */

const CODES = [
  "LEFT_DOOR_MIRROR",
  "RIGHT_DOOR_MIRROR",
  "INTERIOR_MIRROR",
  "LEFT_FRONT_DOOR",
  "RIGHT_FRONT_DOOR",
  "DOOR_HANDLE",
  "PWR_DR_WIND_SWITCH",
  "LEFT_HEADLAMP",
  "A_C_COMPRESSOR",
  "TRANS_GEARBOX",
  "REAR_BUMPER",
  "ENGINE",
  "INSTRUMENTCLUSTER",
];

const labels = (query: string) =>
  matchPartTypes(CODES, query).map((option) => option.label);

describe("part type labels", () => {
  it("reads a code as words, without underscores", () => {
    expect(partTypeLabel("LEFT_DOOR_MIRROR")).toBe("Left Door Mirror");
    expect(partTypeLabel("ENGINE")).toBe("Engine");
  });

  it("expands the supplier's truncated words", () => {
    expect(partTypeLabel("PWR_DR_WIND_SWITCH")).toBe(
      "Power Door Window Switch",
    );
    expect(partTypeLabel("LEFT_REAR_WND_REG_MOTOR")).toBe(
      "Left Rear Window Regulator Motor",
    );
    expect(partTypeLabel("INSTRUMENTCLUSTER")).toBe("Instrument Cluster");
  });

  it("keeps acronyms in capitals", () => {
    expect(partTypeLabel("A_C_COMPRESSOR")).toBe("A/C Compressor");
    expect(partTypeLabel("ABS_SENSOR")).toBe("ABS Sensor");
    expect(partTypeLabel("ECU")).toBe("ECU");
  });
});

describe("searching part types", () => {
  it("finds a word anywhere in the name, not only at the start", () => {
    expect(labels("door")).toEqual(
      expect.arrayContaining([
        "Left Door Mirror",
        "Right Door Mirror",
        "Left Front Door",
        "Door Handle",
        "Power Door Window Switch",
      ]),
    );
  });

  it("puts names that start with the search first", () => {
    expect(labels("door")[0]).toBe("Door Handle");
  });

  it("narrows with every extra word", () => {
    expect(labels("left door")).toEqual([
      "Left Door Mirror",
      "Left Front Door",
    ]);
  });

  it("matches the start of words, so 'ear' does not find Rear or Gearbox", () => {
    expect(labels("ear")).toEqual([]);
  });

  it("understands what people call things", () => {
    expect(labels("headlight")).toEqual(["Left Headlamp"]);
    expect(labels("aircon")).toEqual(["A/C Compressor"]);
    expect(labels("dash")).toEqual(["Instrument Cluster"]);
    expect(labels("gearbox")).toEqual(["Transmission / Gearbox"]);
  });

  it("reads driver and passenger as Australian sides", () => {
    expect(labels("driver mirror")).toEqual(["Right Door Mirror"]);
    expect(labels("passenger door")).toEqual([
      "Left Door Mirror",
      "Left Front Door",
    ]);
  });

  it("does not call the interior mirror a wing mirror", () => {
    expect(labels("wing mirror")).toEqual([
      "Left Door Mirror",
      "Right Door Mirror",
    ]);
  });

  it("ignores case and extra spaces", () => {
    expect(labels("  LEFT   Door ")).toEqual(labels("left door"));
  });

  it("lists everything, alphabetically, when nothing is typed", () => {
    const all = labels("");
    expect(all).toHaveLength(CODES.length);
    expect(all).toEqual([...all].sort((a, b) => a.localeCompare(b)));
  });
});

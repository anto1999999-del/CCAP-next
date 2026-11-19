import { describe, expect, it } from "vitest";
import { yardStatus } from "./hours";

// Sydney is UTC+11 in summer (from October) and UTC+10 in winter.
const at = (iso: string) => yardStatus(new Date(iso));

describe("yardStatus", () => {
  it("is open on a weekday afternoon", () => {
    // Tuesday 17 Nov 2026, 2 pm in Sydney.
    expect(at("2026-11-17T03:00:00Z")).toEqual({
      open: true,
      label: "Open now until 5 pm",
    });
  });

  it("names today's opening before the doors open", () => {
    // Tuesday 7 am in Sydney.
    expect(at("2026-11-16T20:00:00Z").label).toBe("Opens today at 8 am");
  });

  it("closes on the hour, not a minute after", () => {
    // Tuesday 5 pm in Sydney.
    expect(at("2026-11-17T06:00:00Z")).toEqual({
      open: false,
      label: "Closed. Opens tomorrow at 8 am",
    });
  });

  it("keeps Saturday's shorter hours", () => {
    // Saturday 21 Nov, 1 pm and 2 pm in Sydney.
    expect(at("2026-11-21T02:00:00Z").label).toBe("Open now until 2 pm");
    expect(at("2026-11-21T03:00:00Z").label).toBe(
      "Closed. Opens Monday at 8 am",
    );
  });

  it("uses Sydney's date, not the server's", () => {
    // 11 pm Sunday UTC is already Monday 10 am in Sydney.
    expect(at("2026-11-22T23:00:00Z").open).toBe(true);
  });

  it("stays shut on a public holiday and skips past it", () => {
    // Christmas Day 2026 is a Friday; Saturday 26th opens at 9.
    expect(at("2026-12-24T23:00:00Z")).toEqual({
      open: false,
      label: "Closed. Opens tomorrow at 9 am",
    });
    // Saturday 26th after closing: Sunday shut, Monday 28th is Boxing Day.
    expect(at("2026-12-26T04:00:00Z").label).toBe(
      "Closed. Opens Tuesday at 8 am",
    );
  });

  it("follows winter time too", () => {
    // Monday 15 June 2026, 7:30 am in Sydney (UTC+10).
    expect(at("2026-06-14T21:30:00Z").label).toBe("Opens today at 8 am");
  });
});

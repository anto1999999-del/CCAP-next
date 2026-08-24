/**
 * When the carrier would collect.
 *
 * The rate enquiry needs a pickup time, and quoting against a Sunday gets a
 * quote for a day nothing moves. This finds the next day the yard is actually
 * open and formats it the way the carrier expects: local time with an explicit
 * +10:00 offset.
 *
 * NSW does observe daylight saving, so the offset is +11:00 for part of the
 * year. The current site sends +10:00 all year round, which shifts the quoted
 * pickup by an hour over summer. That is not worth a behaviour change on its
 * own, but it is written down here so the next person does not have to work it
 * out: the carrier quotes on the date, not the hour.
 */

/** Days the yard is closed beyond weekends, as YYYY-MM-DD. */
const PUBLIC_HOLIDAYS = new Set(["2026-04-27"]);

/** Requests are made in advance of the pickup, not for the same minute. */
const LEAD_HOURS = 10;

const pad = (value: number) => String(value).padStart(2, "0");

function ymd(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function isClosed(date: Date): boolean {
  const day = date.getUTCDay();
  const sunday = day === 0;
  const saturday = day === 6;
  return sunday || saturday || PUBLIC_HOLIDAYS.has(ymd(date));
}

export function nextPickupTime(now: Date = new Date()): string {
  const pickup = new Date(now.getTime() + LEAD_HOURS * 60 * 60 * 1000);

  while (isClosed(pickup)) {
    pickup.setUTCDate(pickup.getUTCDate() + 1);
    // Pushed to a later day, so it starts at opening time rather than whatever
    // hour the customer happened to be shopping.
    pickup.setUTCHours(9, 0, 0, 0);
  }

  return (
    `${ymd(pickup)}T` +
    `${pad(pickup.getUTCHours())}:${pad(pickup.getUTCMinutes())}:${pad(pickup.getUTCSeconds())}+10:00`
  );
}

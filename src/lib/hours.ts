import { NSW_PUBLIC_HOLIDAYS } from "@/lib/holidays";

/**
 * Whether the yard is open, as the header says it.
 *
 * Worked out in Sydney time, never the visitor's: somebody in Perth at 4 pm
 * their time is looking at a yard that closed an hour ago. The week mirrors
 * `site.hours.displayLine`; change both together.
 */

/** Opening hours by weekday, 0 = Sunday. Minutes since midnight. */
const WEEK: readonly ({ opens: number; closes: number } | null)[] = [
  null,
  { opens: 8 * 60, closes: 17 * 60 },
  { opens: 8 * 60, closes: 17 * 60 },
  { opens: 8 * 60, closes: 17 * 60 },
  { opens: 8 * 60, closes: 17 * 60 },
  { opens: 8 * 60, closes: 17 * 60 },
  { opens: 9 * 60, closes: 14 * 60 },
];

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export type YardStatus = { open: boolean; label: string };

/** "8 am", "5 pm", "8:30 am": the way the yard says it on the phone. */
function clock(minutes: number): string {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const suffix = hour < 12 ? "am" : "pm";
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return minute === 0
    ? `${twelve} ${suffix}`
    : `${twelve}:${String(minute).padStart(2, "0")} ${suffix}`;
}

/** The Sydney calendar date and time for an instant. */
function sydney(now: Date): { ymd: string; weekday: number; minutes: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-AU", {
      timeZone: "Australia/Sydney",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((part) => [part.type, part.value]),
  );

  const ymd = `${parts.year}-${parts.month}-${parts.day}`;
  // Noon UTC on that calendar date, so the weekday cannot slip a day either way.
  const weekday = new Date(`${ymd}T12:00:00Z`).getUTCDay();
  return {
    ymd,
    weekday,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

function hoursOn(ymd: string, weekday: number) {
  return NSW_PUBLIC_HOLIDAYS.has(ymd) ? null : WEEK[weekday];
}

/** The calendar date `days` after `ymd`. */
function addDays(ymd: string, days: number): { ymd: string; weekday: number } {
  const date = new Date(`${ymd}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return { ymd: date.toISOString().slice(0, 10), weekday: date.getUTCDay() };
}

export function yardStatus(now: Date = new Date()): YardStatus {
  const today = sydney(now);
  const hours = hoursOn(today.ymd, today.weekday);

  if (hours && today.minutes >= hours.opens && today.minutes < hours.closes) {
    return { open: true, label: `Open now until ${clock(hours.closes)}` };
  }

  if (hours && today.minutes < hours.opens) {
    return { open: false, label: `Opens today at ${clock(hours.opens)}` };
  }

  // A fortnight is more than any run of closed days the calendar holds.
  for (let ahead = 1; ahead <= 14; ahead++) {
    const day = addDays(today.ymd, ahead);
    const next = hoursOn(day.ymd, day.weekday);
    if (!next) continue;
    const when = ahead === 1 ? "tomorrow" : DAY_NAMES[day.weekday];
    return { open: false, label: `Closed. Opens ${when} at ${clock(next.opens)}` };
  }

  return { open: false, label: "Closed" };
}

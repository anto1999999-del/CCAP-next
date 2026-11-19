/**
 * Days the yard is closed beyond weekends, as YYYY-MM-DD in Sydney time.
 *
 * NSW public holidays, because the yard is at Berkeley Vale. Two things read
 * this: the freight quote, whose carrier refuses a pickup date on a public
 * holiday outright, and the header, which must not tell somebody the yard is
 * open on Christmas Day. A missing holiday breaks the first and misleads with
 * the second. Extend this every year; it runs out after December 2027.
 *
 * Easter Saturday and Sunday are left out because weekends already are. The
 * August bank holiday is a bank holiday only, and is left out on purpose.
 */
export const NSW_PUBLIC_HOLIDAYS: ReadonlySet<string> = new Set([
  "2026-04-27",
  "2026-12-25", // Christmas Day
  "2026-12-28", // Boxing Day falls on a Saturday; the Monday is the holiday
  "2027-01-01", // New Year's Day
  "2027-01-26", // Australia Day
  "2027-03-26", // Good Friday
  "2027-03-29", // Easter Monday
  "2027-06-14", // King's Birthday
  "2027-10-04", // Labour Day
  "2027-12-27", // Christmas Day falls on a Saturday
  "2027-12-28", // Boxing Day falls on a Sunday
]);

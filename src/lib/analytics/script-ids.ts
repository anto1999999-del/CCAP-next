/**
 * The `id` each third-party <script> tag is given.
 *
 * A browser exposes every element with an id as a property of `window` under
 * that id. The Clarity snippet was tagged `id="clarity"`, so `window.clarity`
 * was the script tag itself by the time the snippet ran. The snippet only
 * installs its queue when `window.clarity` is empty, so it installed nothing,
 * and Microsoft's script then failed calling a tag as a function
 * ("a[c] is not a function"). Clarity recorded nothing while that was live.
 *
 * So an id here must never be a name one of these scripts reads from `window`.
 * The prefix keeps them clear of that; the test holds the line.
 */
export const THIRD_PARTY_SCRIPT_IDS = {
  ga4: "ccap-script-ga4",
  clarity: "ccap-script-clarity",
  podium: "ccap-script-podium",
} as const;

/** The globals the three scripts, and our own gtag queue, read or write. */
export const THIRD_PARTY_GLOBALS = [
  "clarity",
  "gtag",
  "dataLayer",
  "google_tag_manager",
  "google_tag_data",
  "Podium",
  "PodiumEventsCallback",
] as const;

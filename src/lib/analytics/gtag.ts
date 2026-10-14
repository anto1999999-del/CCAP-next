import { site } from "@/lib/site";

/**
 * Conversion tracking: GA4 events, and Google Ads conversions alongside them.
 *
 * The site loads Google's tag late on purpose (see ThirdParty): not until the
 * visitor scrolls, taps or has been on the page eight seconds. That suits page
 * views and does not suit conversions, which can happen before any of that --
 * somebody lands on the order confirmation, or taps the phone number, and the
 * event would be lost.
 *
 * So the queue is set up the moment anything is tracked. gtag() only ever
 * pushes to `window.dataLayer`, and Google's script replays that queue in order
 * when it arrives, so an event recorded before the script is still sent. And
 * tracking an event wakes the script, so it arrives now rather than later.
 *
 * Google Ads is optional. Its tag id and each conversion label come from
 * NEXT_PUBLIC_ variables, and any that are empty skip only the Ads half: the
 * GA4 event still goes. These are build-time values in Next, so setting them
 * needs a rebuild to take effect.
 */

type GtagArgs = [command: string, ...rest: unknown[]];

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: GtagArgs) => void;
  }
}

/** Dispatched to bring Google's script in now instead of on first scroll. */
export const WAKE_EVENT = "ccap:analytics-wake";

const ADS_ID = process.env.NEXT_PUBLIC_GADS_ID?.trim() ?? "";

/** The conversion actions Google Ads is told about, by what they mean. */
const ADS_LABELS = {
  purchase: process.env.NEXT_PUBLIC_GADS_LABEL_PURCHASE?.trim() ?? "",
  lead: process.env.NEXT_PUBLIC_GADS_LABEL_LEAD?.trim() ?? "",
  call: process.env.NEXT_PUBLIC_GADS_LABEL_CALL?.trim() ?? "",
} as const;

export type AdsConversion = keyof typeof ADS_LABELS;

/**
 * Where a Google Ads conversion is sent, or null when it cannot be: no Ads tag
 * id, or no label for this conversion. Pure, so the rule is tested.
 */
export function adsSendTo(adsId: string, label: string): string | null {
  const id = adsId.trim();
  const tag = label.trim();
  return id && tag ? `${id}/${tag}` : null;
}

let ready = false;

/**
 * Sets up the queue and the configuration, once per page load.
 *
 * Called both by the loader and by the first tracked event, whichever comes
 * first, so the configuration always precedes any event in the queue: Google
 * processes it in order, and an event ahead of its `config` has nowhere to go.
 */
export function ensureGtag(): void {
  if (ready || typeof window === "undefined") return;
  ready = true;

  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function gtag() {
    // gtag.js reads the arguments object itself, not an array copy of it;
    // pushing a spread array is silently ignored by Google's script.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer?.push(arguments);
  };

  // Shows up in GA4's DebugView when testing locally, and only then.
  const debug =
    window.location.hostname === "localhost" ? { debug_mode: true } : {};

  window.gtag("js", new Date());
  window.gtag("config", site.analytics.ga4, debug);
  if (ADS_ID) window.gtag("config", ADS_ID);
}

/** Bring Google's script in now. A no-op where analytics is switched off. */
function wake(): void {
  window.dispatchEvent(new Event(WAKE_EVENT));
}

/**
 * Record one event in GA4 and, when it is a conversion and configured, in
 * Google Ads too.
 */
export function track(
  event: string,
  params: Record<string, unknown>,
  ads?: {
    conversion: AdsConversion;
    value?: number;
    currency?: string;
    transactionId?: string;
  },
): void {
  if (typeof window === "undefined") return;

  ensureGtag();
  window.gtag?.("event", event, params);

  const sendTo = ads ? adsSendTo(ADS_ID, ADS_LABELS[ads.conversion]) : null;
  if (ads && sendTo) {
    window.gtag?.("event", "conversion", {
      send_to: sendTo,
      ...(ads.value !== undefined ? { value: ads.value } : {}),
      ...(ads.currency ? { currency: ads.currency } : {}),
      ...(ads.transactionId ? { transaction_id: ads.transactionId } : {}),
    });
  }

  wake();
}

/** A form the server accepted. Never on a click: only on a confirmed send. */
export function trackLead(
  formName: "part_enquiry" | "sell_car" | "contact",
): void {
  track("generate_lead", { form_name: formName }, { conversion: "lead" });
}

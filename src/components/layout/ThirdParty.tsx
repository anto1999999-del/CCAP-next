"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Script from "next/script";
import { site } from "@/lib/site";
import {
  ensureGtag,
  subscribeWake,
  track,
  wakeWasRequested,
} from "@/lib/analytics/gtag";
import { phoneLinkLocation } from "@/lib/analytics/locations";
import { THIRD_PARTY_SCRIPT_IDS } from "@/lib/analytics/script-ids";

/**
 * Analytics and the chat widget.
 *
 * Three third-party scripts run on the current site and none of them had been
 * carried across: Google Analytics, Microsoft Clarity and Podium Webchat. The
 * new site has been running with no measurement at all.
 *
 * They are loaded the way the current site loads Podium: not at all until the
 * visitor does something. Podium's widget alone is several hundred kilobytes,
 * and a chat bubble nobody has asked for should not be competing with the page
 * for the first paint on a phone. Waiting for the first scroll, tap or key
 * press keeps them out of the load entirely for anyone who bounces.
 *
 * Analytics still records the visit: a page view fires as soon as the script
 * arrives, and anybody who left before touching the page was never going to be
 * a useful data point anyway.
 *
 * None of this runs on the admin. Measuring the yard's own staff working
 * through the morning's orders pollutes the numbers the owner reads, and there
 * is nobody to chat to on a dashboard.
 *
 * A conversion (lib/analytics/gtag) does not wait for any of that: it queues
 * its event and asks for the script, which brings it in at once -- including
 * when the event was tracked before this component mounted, which is the case
 * on the order confirmation.
 */

declare global {
  interface Window {
    /** Podium's webchat calls this with the name of whatever just happened. */
    PodiumEventsCallback?: (event: string, properties?: unknown) => void;
  }
}

/** The events that mean somebody is actually here. */
const WAKE = ["scroll", "pointerdown", "keydown", "touchstart"] as const;

/** The server never has a tracked event, and hydration must agree with it. */
const neverOnServer = () => false;

export default function ThirdParty({ enabled }: { enabled: boolean }) {
  const [touched, setTouched] = useState(false);
  // Read, not listened for: the request may be older than this component.
  const asked = useSyncExternalStore(
    subscribeWake,
    wakeWasRequested,
    neverOnServer,
  );
  const awake = touched || asked;

  useEffect(() => {
    if (!enabled) return;

    const wake = () => setTouched(true);
    for (const event of WAKE) {
      window.addEventListener(event, wake, { once: true, passive: true });
    }

    /*
      Every tap on a phone number, wherever it is. One listener on the page
      rather than a handler on each of the dozen tel: links, so a link added
      next month is counted without anybody remembering to wire it.
    */
    const onClick = (event: MouseEvent) => {
      const link =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>('a[href^="tel:"]')
          : null;
      if (!link) return;
      track(
        "phone_click",
        {
          link_location: phoneLinkLocation(
            window.location.pathname,
            link.closest<HTMLElement>("[data-phone-location]")?.dataset
              .phoneLocation,
          ),
        },
        { conversion: "call" },
      );
    };
    document.addEventListener("click", onClick, { capture: true });

    /*
      Podium calls this when something happens in the chat. "Conversation
      Started" is a visitor sending their first message. The name comes from
      Podium's community documentation rather than an official reference, so
      it is matched exactly and anything else is ignored.
    */
    window.PodiumEventsCallback = (name) => {
      if (name === "Conversation Started") track("chat_start", {});
    };

    /*
      And a backstop, for somebody who reads without touching anything. Long
      enough to be well clear of the first paint.
    */
    const timer = window.setTimeout(wake, 8000);

    return () => {
      for (const event of WAKE) window.removeEventListener(event, wake);
      document.removeEventListener("click", onClick, { capture: true });
      window.clearTimeout(timer);
    };
  }, [enabled]);

  // The queue and its configuration, ahead of the script that will read them.
  if (enabled && awake) ensureGtag();

  if (!enabled || !awake) return null;

  const { ga4, clarity, podiumToken } = site.analytics;

  return (
    <>
      <Script
        id={THIRD_PARTY_SCRIPT_IDS.ga4}
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${ga4}`}
      />

      <Script id={THIRD_PARTY_SCRIPT_IDS.clarity} strategy="afterInteractive">
        {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${clarity}");`}
      </Script>

      <Script
        id={THIRD_PARTY_SCRIPT_IDS.podium}
        strategy="lazyOnload"
        src={`https://connect.podium.com/widget.js#ORG_TOKEN=${podiumToken}`}
      />
    </>
  );
}

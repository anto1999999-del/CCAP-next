"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";

/**
 * The cookie notice.
 *
 * Informational, not a consent gate: Australian privacy law does not require
 * prior opt-in for analytics the way the GDPR does, and gating the site's own
 * analytics behind a click most visitors ignore would quietly hollow out the
 * owner's traffic numbers. So this tells people what the site does and links
 * the policy, rather than blocking anything.
 *
 * It renders nothing on the server: the choice lives in localStorage, which the
 * server cannot see, so rendering the bar there would flash it at people who
 * dismissed it weeks ago. It appears after hydration, and only if no choice has
 * been stored.
 */

const STORAGE_KEY = "ccap-cookie-consent";

/*
  localStorage is an external store, so it is read through
  useSyncExternalStore: the server snapshot says "acknowledged" (render
  nothing), and React re-reads the real value after hydration without a
  mismatch. Listeners are notified by hand on accept, and by the storage
  event when another tab accepts.
*/
const listeners = new Set<() => void>();

// Covers storage that reads but refuses writes: close it for this visit anyway.
let dismissedThisVisit = false;

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function acknowledged(): boolean {
  if (dismissedThisVisit) return true;
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    // Private mode or blocked storage: don't nag on every page in that case.
    return true;
  }
}

export default function CookieConsent() {
  const hidden = useSyncExternalStore(subscribe, acknowledged, () => true);

  function accept() {
    dismissedThisVisit = true;
    try {
      localStorage.setItem(STORAGE_KEY, `accepted:${new Date().toISOString()}`);
    } catch {
      // Remembered for this visit only; nothing more we can do.
    }
    listeners.forEach((notify) => notify());
  }

  if (hidden) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie notice"
      className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3 sm:px-4 sm:pb-4"
    >
      <div className="border-line bg-card mx-auto flex max-w-4xl flex-col gap-4 rounded-2xl border p-5 shadow-2xl shadow-black/40 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <p className="text-sm leading-relaxed text-gray-300">
          We use cookies to keep the site working, keep it secure and understand
          how it is used, so we can make it better. See our{" "}
          <Link
            href="/privacy"
            className="text-brand-text font-medium underline-offset-4 hover:underline"
          >
            Privacy &amp; Cookie Policy
          </Link>{" "}
          for the detail.
        </p>

        <div className="flex flex-shrink-0 items-center gap-3">
          <Link
            href="/privacy"
            className="border-line hover:border-white/30 rounded-full border px-5 py-2.5 text-center text-xs font-bold tracking-[0.12em] text-white uppercase transition-colors"
          >
            Learn more
          </Link>
          <button
            type="button"
            onClick={accept}
            className="bg-brand hover:bg-brand-hover rounded-full px-6 py-2.5 text-xs font-bold tracking-[0.12em] text-white uppercase transition-colors"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}

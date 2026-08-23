"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Loads reCAPTCHA v3 and mints action tokens.
 *
 * Written directly against Google's API rather than pulling in a wrapper
 * library. The script is fetched on first use rather than on every page load,
 * so pages with no protected form pay nothing for it, the old site loaded it
 * site-wide from the app root.
 *
 * The badge is hidden by CSS, which Google permits only while the required
 * notice is shown instead. That notice is in the footer; keep them together.
 */

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, opts: { action: string }) => Promise<string>;
    };
  }
}

const SCRIPT_ID = "recaptcha-v3";

function siteKey(): string | undefined {
  return process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim() || undefined;
}

function loadScript(key: string): Promise<void> {
  if (document.getElementById(SCRIPT_ID)) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = `https://www.google.com/recaptcha/api.js?render=${key}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("reCAPTCHA failed to load"));
    document.head.appendChild(script);
  });
}

export function useRecaptcha() {
  const loading = useRef<Promise<void> | null>(null);

  // Warm the script once the form is on screen, so submitting does not wait on
  // a cold network fetch.
  useEffect(() => {
    const key = siteKey();
    if (!key) return;
    loading.current ??= loadScript(key).catch(() => {});
  }, []);

  /**
   * Returns a token, or null when reCAPTCHA is unavailable. Null is passed to
   * the server, which decides what to do with it, the client never gets to
   * conclude that a check passed.
   */
  return useCallback(async (action: string): Promise<string | null> => {
    const key = siteKey();
    if (!key) return null;

    try {
      loading.current ??= loadScript(key);
      await loading.current;

      const grecaptcha = window.grecaptcha;
      if (!grecaptcha) return null;

      await new Promise<void>((resolve) => grecaptcha.ready(resolve));
      return await grecaptcha.execute(key, { action });
    } catch {
      return null;
    }
  }, []);
}

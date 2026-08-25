"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithGoogle } from "@/app/actions/auth";

/**
 * Google's own sign-in button.
 *
 * Rendered by Google rather than drawn by us: their script owns the button so
 * that the account chooser, the branding and the consent behaviour are the ones
 * people already recognise, and so it keeps working when Google changes them.
 *
 * The token it hands back goes straight to the server, which verifies it with
 * Google before trusting a word of it.
 */

type CredentialResponse = { credential?: string };

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: CredentialResponse) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: Record<string, string | number>,
          ) => void;
        };
      };
    };
  }
}

export default function GoogleSignIn({ next }: { next: string }) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const holder = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleCredential = useCallback(
    async (response: CredentialResponse) => {
      if (!response.credential) {
        setError("Google did not return a sign-in. Please try again.");
        return;
      }

      const result = await signInWithGoogle(response.credential);
      if (result.message) {
        setError(result.message);
        return;
      }

      // Replaced rather than pushed: going back to a sign-in page you have just
      // used is never what somebody wants.
      router.replace(next);
      router.refresh();
    },
    [next, router],
  );

  useEffect(() => {
    if (!ready || !clientId || !holder.current) return;

    window.google?.accounts.id.initialize({
      client_id: clientId,
      callback: handleCredential,
    });

    window.google?.accounts.id.renderButton(holder.current, {
      theme: "filled_black",
      size: "large",
      shape: "pill",
      text: "continue_with",
      width: 320,
    });
  }, [ready, clientId, handleCredential]);

  if (!clientId) return null;

  return (
    <div>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setReady(true)}
      />

      <div ref={holder} className="flex min-h-[44px] justify-center" />

      {error && (
        <p role="alert" className="text-brand-text mt-3 text-center text-sm">
          {error}
        </p>
      )}
    </div>
  );
}

import "server-only";

/**
 * Server-side reCAPTCHA v3 verification.
 *
 * Two deliberate differences from the implementation this replaces:
 *
 * 1. **It fails closed.** The old version returned `ok: true` from its catch
 *    block, so anything that stopped the request reaching Google, a network
 *    blip, a firewall, a deliberate flood, silently disabled the check. A
 *    verification that cannot be performed is not a verification that passed.
 *
 * 2. **Verification is skipped only when no secret is configured**, which is
 *    the local-development case, and it says so in the result rather than
 *    pretending a check happened. The old code additionally let a *missing
 *    token* through whenever a global "strict" flag was off, which meant any
 *    caller that simply omitted the token bypassed it entirely.
 */

const VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

/** Google returns 0.0-1.0; below this we treat the caller as a bot. */
const MIN_SCORE = Number(process.env.RECAPTCHA_MIN_SCORE) || 0.5;

/** How long to wait on Google before giving up. */
const TIMEOUT_MS = 5000;

export type RecaptchaResult =
  | { ok: true; reason: "verified" | "not-configured" }
  | {
      ok: false;
      reason: "missing-token" | "rejected" | "low-score" | "unavailable";
      score?: number;
    };

export async function verifyRecaptcha(
  token: string | null | undefined,
  action: string,
): Promise<RecaptchaResult> {
  const secret = process.env.RECAPTCHA_SECRET_KEY?.trim();

  // No secret means reCAPTCHA is not set up for this environment. Reported
  // honestly so a caller can decide whether that is acceptable, rather than
  // being disguised as a successful check.
  if (!secret) return { ok: true, reason: "not-configured" };

  if (!token) return { ok: false, reason: "missing-token" };

  try {
    const response = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });

    if (!response.ok) return { ok: false, reason: "unavailable" };

    const data = (await response.json()) as {
      success?: boolean;
      score?: number;
      action?: string;
    };

    if (!data.success) return { ok: false, reason: "rejected" };

    // Google echoes back the action the token was minted for. Checking it stops
    // a token harvested from a low-value form being replayed against a
    // higher-value one; the old code requested the action but never compared it.
    if (data.action && data.action !== action) {
      return { ok: false, reason: "rejected" };
    }

    if (typeof data.score === "number" && data.score < MIN_SCORE) {
      return { ok: false, reason: "low-score", score: data.score };
    }

    return { ok: true, reason: "verified" };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}

/** Wording shown to the visitor. Never leaks why they were rejected. */
export function recaptchaMessage(reason: RecaptchaResult["reason"]): string {
  switch (reason) {
    case "unavailable":
      return "We could not complete the security check just now. Please try again in a moment.";
    default:
      return "Security check failed. Please refresh the page and try again.";
  }
}

import "server-only";
import Stripe from "stripe";

/**
 * Stripe.
 *
 * The secret key never leaves the server, and it is not in this repository. The
 * publishable key is public by design and is the only one the browser sees.
 *
 * `isPaymentConfigured` exists so the checkout can say payment is switched off
 * rather than failing on the first call. A site deployed without these keys
 * should be obviously missing them, not mysteriously broken at the last step.
 */

let stripe: Stripe | null = null;

export function isPaymentConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  );
}

export function payments(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set, so payments cannot be taken.");
  }

  stripe ??= new Stripe(key, {
    // Pinned. An account-level API upgrade should not change how this site
    // behaves without somebody deciding to change it.
    apiVersion: "2026-07-29.dahlia",
    timeout: 20_000,
    telemetry: false,
  });

  return stripe;
}

/**
 * Whether the keys in use are Stripe's test keys.
 *
 * Shown in the checkout so nobody demonstrates the site with test keys and
 * believes money moved, or worse, uses live keys while testing.
 */
export function isTestMode(): boolean {
  return (process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_test_");
}

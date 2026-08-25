"use client";

import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useState } from "react";
import { site } from "@/lib/site";

/**
 * Taking the card details.
 *
 * The card never touches this site: Stripe's element is an iframe served by
 * Stripe, and what comes back is a payment already confirmed with them.
 *
 * The amount is not passed in from here either. It was fixed on the server when
 * the payment was created, from the catalogue and the carrier, and this form
 * can only confirm that payment or fail.
 */

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

// Loaded once for the page, not once per render: it fetches Stripe's script.
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

export default function PaymentPanel({
  clientSecret,
  onCancel,
}: {
  clientSecret: string;
  onCancel: () => void;
}) {
  if (!stripePromise) {
    return (
      <p className="rounded-xl border-line border bg-field p-4 text-sm text-gray-300">
        Card payment is not switched on. Call {site.contact.phone} to pay.
      </p>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: "night",
          variables: {
            colorPrimary: "#e9162f",
            colorBackground: "#0d0d0d",
            fontFamily: "Arial, Helvetica, sans-serif",
          },
        },
      }}
    >
      <PayForm onCancel={onCancel} />
    </Elements>
  );
}

function PayForm({ onCancel }: { onCancel: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  async function pay(event: React.FormEvent) {
    event.preventDefault();
    if (!stripe || !elements) return;

    setPaying(true);
    setError(null);

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // Where the bank sends the customer back to after a 3D Secure step.
        // The page there reads the outcome from Stripe, not from this form.
        return_url: `${window.location.origin}/order-success`,
      },
    });

    /*
      Reached only when the payment failed without leaving the page. A success
      redirects, and so does anything the bank wants the customer to approve.
    */
    if (result.error) {
      setError(
        result.error.message ??
          "That payment could not be completed. Please check the card details.",
      );
      setPaying(false);
    }
  }

  return (
    <form onSubmit={pay} className="space-y-4">
      <PaymentElement />

      {error && (
        <p
          role="alert"
          className="rounded-xl border-line border bg-field p-3 text-sm text-gray-200"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!stripe || paying}
        className="bg-brand hover:bg-brand-hover w-full rounded-full px-4 py-3 text-sm font-semibold tracking-wide text-white uppercase transition-colors disabled:opacity-60"
      >
        {paying ? "Paying..." : "Pay now"}
      </button>

      <button
        type="button"
        onClick={onCancel}
        disabled={paying}
        className="w-full text-sm text-gray-400 transition-colors hover:text-white disabled:opacity-60"
      >
        Change my details
      </button>
    </form>
  );
}

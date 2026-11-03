"use client";

import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { LockClosedIcon } from "@heroicons/react/24/outline";
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
 * can only confirm that payment or fail. The label on the button is the figure
 * that payment was created for, nothing the page worked out.
 */

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

// Loaded once for the page, not once per render: it fetches Stripe's script.
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

/** What the customer already gave on the form, in the shape Stripe takes it. */
export type PaymentBilling = {
  name: string;
  email: string;
  phone: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
};

export default function PaymentPanel({
  clientSecret,
  amount,
  billing,
  onPayingChange,
}: {
  clientSecret: string;
  amount: string;
  billing: PaymentBilling;
  /** So the page can stop the details changing under a payment in flight. */
  onPayingChange: (paying: boolean) => void;
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
      <PayForm
        amount={amount}
        billing={billing}
        onPayingChange={onPayingChange}
      />
    </Elements>
  );
}

function PayForm({
  amount,
  billing,
  onPayingChange,
}: {
  amount: string;
  billing: PaymentBilling;
  onPayingChange: (paying: boolean) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  function setBusy(busy: boolean) {
    setPaying(busy);
    onPayingChange(busy);
  }

  async function pay(event: React.FormEvent) {
    event.preventDefault();
    if (!stripe || !elements) return;

    setBusy(true);
    setError(null);

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // Where the bank sends the customer back to after a 3D Secure step.
        // The page there reads the outcome from Stripe, not from this form.
        return_url: `${window.location.origin}/order-success`,
        // Required, not a courtesy: Stripe refuses a payment that has neither
        // collected these fields nor been handed them, and the form hides them.
        payment_method_data: { billing_details: billing },
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
      setBusy(false);
    }
  }

  return (
    <form onSubmit={pay} className="space-y-4">
      {/*
        Asks only for what the billing form did not. Left to itself Stripe asks
        for the name, email and country again, guesses the country from the
        connection, and offers to sign the customer up to its Link wallet, which
        doubled the height of the form.
      */}
      <PaymentElement
        options={{
          wallets: { link: "never" },
          fields: {
            billingDetails: {
              name: "never",
              email: "never",
              phone: "never",
              address: { country: "never", postalCode: "never" },
            },
          },
        }}
      />

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
        className="bg-brand hover:bg-brand-hover w-full rounded-xl px-4 py-3.5 text-sm font-semibold tracking-wide text-white uppercase transition-colors disabled:opacity-60"
      >
        {paying ? "Paying..." : `Pay ${amount}`}
      </button>

      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-gray-500">
        <LockClosedIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Your card details go straight to Stripe, never to our site
      </p>
    </form>
  );
}

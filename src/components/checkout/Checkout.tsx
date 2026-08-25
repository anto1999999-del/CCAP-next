"use client";

import Link from "next/link";
import Container from "@/components/layout/Container";
import { useEffect, useState, useTransition } from "react";
import { quoteCheckout, type CheckoutQuote } from "@/app/actions/checkout";
import { startPayment } from "@/app/actions/payment";
import PaymentPanel from "./PaymentPanel";
import { useCart } from "@/lib/cart/CartProvider";
import { formatCents } from "@/lib/parts/price";
import { site } from "@/lib/site";

/**
 * The checkout.
 *
 * The figures on the right are not worked out here. The cart is sent to the
 * server as a list of parts and quantities, and the server answers with the
 * prices from the catalogue and freight from the carrier. That answer is what
 * is displayed and what the payment will be created from, so the customer sees
 * the number they will be charged, and a customer who edits this page changes
 * nothing but their own screen.
 */

type Details = {
  name: string;
  email: string;
  phone: string;
  address: string;
  suburb: string;
  postcode: string;
};

const EMPTY: Details = {
  name: "",
  email: "",
  phone: "",
  address: "",
  suburb: "",
  postcode: "",
};

const FIELDS: {
  name: keyof Details;
  label: string;
  type: string;
  autoComplete: string;
}[] = [
  { name: "name", label: "Full name", type: "text", autoComplete: "name" },
  { name: "email", label: "Email", type: "email", autoComplete: "email" },
  { name: "phone", label: "Phone", type: "tel", autoComplete: "tel" },
  {
    name: "address",
    label: "Street address",
    type: "text",
    autoComplete: "street-address",
  },
  {
    name: "suburb",
    label: "Suburb",
    type: "text",
    autoComplete: "address-level2",
  },
  {
    name: "postcode",
    label: "Postcode",
    type: "text",
    autoComplete: "postal-code",
  },
];

export default function Checkout() {
  const { lines } = useCart();
  const [details, setDetails] = useState<Details>(EMPTY);
  const [pickup, setPickup] = useState(false);
  /*
    The quote is stored with the request it answers. Anything that changes the
    price changes the key, so a quote for Wyong can never sit on screen while
    the address says Perth: it simply stops matching and is not shown.
  */
  const [answered, setAnswered] = useState<{
    key: string;
    quote: CheckoutQuote;
  } | null>(null);
  const [pending, startQuoting] = useTransition();
  /*
    Set once the server has created the payment. Its presence is what swaps the
    summary for the card form, so the customer cannot be paying while the
    address behind them is still being edited.
  */
  const [payment, setPayment] = useState<{ clientSecret: string } | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [starting, startingPayment] = useTransition();

  const complete =
    details.name.trim().length > 1 &&
    details.email.includes("@") &&
    details.phone.trim().length > 5 &&
    (pickup ||
      (details.address.trim().length > 3 &&
        details.suburb.trim().length > 1 &&
        /^\d{3,4}$/.test(details.postcode.trim())));

  function beginPayment() {
    setPaymentError(null);
    startingPayment(async () => {
      const result = await startPayment({
        lines: lines.map((line) => ({
          urgId: line.urgId,
          invNumber: line.invNumber,
          quantity: line.quantity,
        })),
        pickup,
        name: details.name.trim(),
        email: details.email.trim(),
        phone: details.phone.trim(),
        // The yard's own address when collecting, so the order still records
        // somewhere, and the customer is not asked for one they do not need.
        address: pickup ? site.address.displayLine : details.address.trim(),
        suburb: pickup ? "Berkeley Vale" : details.suburb.trim(),
        postcode: pickup ? "2261" : details.postcode.trim(),
      });

      if (result.ok) setPayment({ clientSecret: result.clientSecret });
      else setPaymentError(result.message);
    });
  }

  /*
    A full four-digit postcode, not three. Quoting on a partial one sends the
    carrier a suburb and postcode that do not belong together, which it answers
    with a 500: typing "Melbourne" while the postcode still says 2259 produced
    exactly that.
  */
  const deliverable =
    pickup ||
    (details.suburb.trim().length > 1 &&
      /^\d{4}$/.test(details.postcode.trim()));

  const requestKey = [
    pickup ? "pickup" : "deliver",
    details.suburb.trim().toLowerCase(),
    details.postcode.trim(),
    lines
      .map((line) => `${line.urgId}:${line.invNumber}:${line.quantity}`)
      .join(","),
  ].join("|");

  const quote = answered?.key === requestKey ? answered.quote : null;

  /*
    Re-quoted whenever the destination changes, because freight is most of the
    difference between a $500 gearbox delivered to Wyong and the same one going
    to Perth, and a customer should see that before they commit to anything.
  */
  useEffect(() => {
    if (lines.length === 0 || !deliverable) return;

    const identifiers = lines.map((line) => ({
      urgId: line.urgId,
      invNumber: line.invNumber,
      quantity: line.quantity,
    }));
    const key = requestKey;

    /*
      Debounced by nearly a second. This runs as somebody types, each run is a
      request to a paid service, and a suburb and postcode are usually typed one
      after the other: waiting means one quote for the pair rather than one for
      every intermediate state.
    */
    const timer = setTimeout(() => {
      startQuoting(async () => {
        const quote = await quoteCheckout({
          lines: identifiers,
          pickup,
          suburb: details.suburb.trim(),
          postcode: details.postcode.trim(),
        });
        setAnswered({ key, quote });
      });
    }, 900);

    return () => clearTimeout(timer);
  }, [
    lines,
    pickup,
    details.suburb,
    details.postcode,
    deliverable,
    requestKey,
  ]);

  if (lines.length === 0) {
    return (
      <div className="bg-surface flex min-h-[60vh] flex-col items-center justify-center px-6 text-center text-white">
        <h1 className="mb-3 text-3xl font-bold">
          There is nothing to check out
        </h1>
        <p className="mb-8 max-w-md text-sm text-gray-400">
          Your cart is empty, so there is nothing to pay for yet.
        </p>
        <Link
          href="/products"
          className="bg-brand hover:bg-brand-hover rounded-md px-6 py-3 font-semibold text-white transition-colors"
        >
          Browse parts
        </Link>
      </div>
    );
  }

  // Only ever shown while the server has not answered yet, and labelled as an
  // estimate so it can never be mistaken for the price being charged.
  const indicativeSubtotal = lines.reduce(
    (total, line) => total + Math.round(line.price * 100) * line.quantity,
    0,
  );

  return (
    <div className="bg-admin min-h-screen py-10 text-white">
      <Container>
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-wide md:text-4xl">
            Checkout
          </h1>
          <p className="mt-2 text-sm text-gray-400 md:text-base">
            Tell us where it is going and we will price the freight before you
            pay.
          </p>
        </header>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <section className="w-full min-w-0 shrink-0 rounded-2xl border border-gray-800 bg-[#151518] p-6 shadow-xl lg:max-w-lg">
            <h2 className="mb-5 text-xl font-bold md:text-2xl">
              Delivery Info
            </h2>

            {FIELDS.map((field) => (
              <div key={field.name} className="mb-4">
                <label
                  htmlFor={`checkout-${field.name}`}
                  className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-400 uppercase"
                >
                  {field.label}
                </label>
                <input
                  id={`checkout-${field.name}`}
                  name={field.name}
                  type={field.type}
                  autoComplete={field.autoComplete}
                  value={details[field.name]}
                  onChange={(event) =>
                    setDetails((current) => ({
                      ...current,
                      [field.name]: event.target.value,
                    }))
                  }
                  className="focus:border-brand box-border w-full min-w-0 rounded-lg border border-gray-800 bg-[#0d0d0d] p-3 text-base text-white placeholder-gray-600 transition-colors focus:outline-none"
                />
              </div>
            ))}

            <label className="mt-1 inline-flex cursor-pointer items-center gap-2.5 rounded-lg border border-gray-800 bg-[#0d0d0d] px-4 py-3 text-sm transition-colors hover:border-gray-700">
              <input
                type="checkbox"
                checked={pickup}
                onChange={() => setPickup((current) => !current)}
                className="accent-brand h-4 w-4"
              />
              Pickup from Berkeley Vale (skip delivery)
            </label>
          </section>

          <section className="flex min-w-0 flex-1 flex-col rounded-2xl border border-gray-800 bg-[#151518] p-6 shadow-xl">
            <h2 className="mb-5 text-xl font-bold md:text-2xl">
              Order summary
            </h2>

            {quote?.ok && (
              <ul className="border-line mb-5 space-y-3 border-b pb-5">
                {quote.lines.map((line) => (
                  <li key={`${line.name}-${line.dimensions}`}>
                    <div className="flex justify-between gap-4 text-sm">
                      <span className="truncate text-gray-200">
                        {line.quantity > 1 && `${line.quantity} x `}
                        {line.name}
                      </span>
                      <span className="shrink-0 font-semibold">
                        {line.parts}
                      </span>
                    </div>
                    <div className="mt-0.5 flex justify-between gap-4 text-xs text-gray-500">
                      <span>
                        {line.weightKg} kg, {line.dimensions}
                        {line.measured ? "" : " (estimated)"}
                      </span>
                      {line.freightAlone && (
                        <span className="shrink-0">
                          {line.freightAlone} to send on its own
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="mb-4 space-y-2">
              <Line
                label="Parts"
                value={
                  quote?.ok ? quote.subtotal : formatCents(indicativeSubtotal)
                }
                muted={!quote?.ok}
              />
              <Line
                label="Delivery"
                value={
                  pickup
                    ? "Pickup"
                    : !deliverable
                      ? "Enter a suburb and postcode"
                      : pending
                        ? "Calculating..."
                        : quote?.ok
                          ? quote.freight
                          : "Not available"
                }
                muted={!quote?.ok || pending}
              />
              <div className="mt-2 flex items-center justify-between border-t border-gray-700 pt-3">
                <span className="text-base font-semibold">Total</span>
                <span className="text-xl font-bold">
                  {quote?.ok ? quote.total : "..."}
                </span>
              </div>
            </div>

            {quote?.ok && quote.lines.some((line) => line.freightAlone) && (
              <p className="mb-4 text-xs leading-relaxed text-gray-500">
                The per-part figures are what each would cost to send by itself.
                They add up to more than the delivery charged above, because the
                carrier prices the whole consignment as one shipment.
              </p>
            )}

            {quote?.ok && quote.problems.length > 0 && (
              <ul className="mb-4 space-y-2 rounded-lg border border-yellow-700/40 bg-yellow-900/10 p-4 text-sm text-yellow-200">
                {quote.problems.map((problem) => (
                  <li key={`${problem.urgId}-${problem.invNumber}`}>
                    {problem.message}
                  </li>
                ))}
              </ul>
            )}

            {quote?.ok &&
              quote.freightEstimated &&
              !quote.freightUnavailable && (
                <p className="mb-4 rounded-lg border border-gray-700 bg-[#0d0d0d] p-4 text-sm text-gray-300">
                  One of these parts has not been weighed yet, so the delivery
                  price above is an estimate. We will confirm it before it ships
                  and let you know if it changes.
                </p>
              )}

            {quote?.ok && quote.freightUnavailable && (
              <p className="mb-4 rounded-lg border border-gray-700 bg-[#0d0d0d] p-4 text-sm text-gray-300">
                We could not price the freight automatically for that address.
                Call us on{" "}
                <a
                  href={`tel:${site.contact.phoneE164}`}
                  className="text-brand-text font-semibold"
                >
                  {site.contact.phone}
                </a>{" "}
                and we will quote it while you wait.
              </p>
            )}

            {quote && !quote.ok && (
              <p className="mb-4 rounded-lg border border-gray-700 bg-[#0d0d0d] p-4 text-sm text-gray-300">
                {quote.message}
              </p>
            )}

            {payment ? (
              <PaymentPanel
                clientSecret={payment.clientSecret}
                onCancel={() => setPayment(null)}
              />
            ) : (
              <PaymentStep
                ready={Boolean(quote?.ok) && complete}
                starting={starting}
                error={paymentError}
                onPay={beginPayment}
              />
            )}
          </section>
        </div>
      </Container>
    </div>
  );
}

function Line({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted: boolean;
}) {
  return (
    <div className="flex justify-between text-sm md:text-base">
      <span className="text-gray-400">{label}</span>
      <span className={muted ? "text-gray-500" : "text-gray-200"}>{value}</span>
    </div>
  );
}

/**
 * Where the card form goes.
 *
 * Everything up to this point works: the order is priced, the freight is
 * quoted, and the total shown is the total the payment would be created from.
 * Taking the money needs Stripe keys, which are not configured yet, so rather
 * than pretend, the page says so and offers the phone.
 */
function PaymentStep({
  ready,
  starting,
  error,
  onPay,
}: {
  ready: boolean;
  starting: boolean;
  error: string | null;
  onPay: () => void;
}) {
  const configured = Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

  if (!configured) {
    return (
      <div className="mt-auto rounded-lg border border-gray-700 bg-[#0d0d0d] p-5">
        <p className="mb-2 text-sm font-semibold text-white">
          Card payment is not switched on yet
        </p>
        <p className="mb-4 text-sm text-gray-400">
          The order and the freight above are priced and ready. To pay for this
          order today, call the yard and quote your parts.
        </p>
        <a
          href={`tel:${site.contact.phoneE164}`}
          className="bg-brand hover:bg-brand-hover block rounded-full px-4 py-3 text-center text-sm font-semibold tracking-wide text-white uppercase transition-colors"
        >
          Call {site.contact.phone}
        </a>
      </div>
    );
  }

  return (
    <div className="mt-auto">
      {error && (
        <p
          role="alert"
          className="mb-3 rounded-lg border border-gray-700 bg-[#0d0d0d] p-3 text-sm text-gray-200"
        >
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={onPay}
        disabled={!ready || starting}
        className="bg-brand hover:bg-brand-hover w-full rounded-full px-4 py-3 text-sm font-semibold tracking-wide text-white uppercase transition-colors disabled:opacity-50"
      >
        {starting ? "Preparing..." : "Continue to payment"}
      </button>

      {!ready && (
        <p className="mt-2 text-center text-xs text-gray-500">
          Fill in your details above to continue.
        </p>
      )}
    </div>
  );
}

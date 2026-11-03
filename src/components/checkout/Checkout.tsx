"use client";

import Link from "next/link";
import { ChevronDownIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import Container from "@/components/layout/Container";
import PartThumbnail from "@/components/parts/PartThumbnail";
import { useEffect, useRef, useState, useTransition } from "react";
import { quoteCheckout, type CheckoutQuote } from "@/app/actions/checkout";
import { startPayment } from "@/app/actions/payment";
import CheckoutSteps from "./CheckoutSteps";
import PaymentPanel from "./PaymentPanel";
import { useCart } from "@/lib/cart/CartProvider";
import { isSameLine, lineVehicle, type CartLine } from "@/lib/cart/types";
import {
  AU_STATES,
  MAX_NOTES,
  NO_DETAILS,
  detailsComplete,
  fullName,
  type AuState,
  type BillingDetails,
} from "@/lib/checkout/details";
import { PART_IMAGE_PLACEHOLDER } from "@/lib/parts/images";
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
 *
 * Two steps on one address: the details form, then payment. Payment replaces
 * the form rather than sitting beside it, so the customer cannot be paying
 * while the address behind them is still being edited.
 */

const FIELDS: {
  name: Exclude<keyof BillingDetails, "state" | "notes">;
  label: string;
  type: string;
  autoComplete: string;
  required?: boolean;
  /** Half a row. Anything else spans it. */
  half?: boolean;
  inputMode?: "numeric";
}[] = [
  {
    name: "firstName",
    label: "First name",
    type: "text",
    autoComplete: "given-name",
    required: true,
    half: true,
  },
  {
    name: "lastName",
    label: "Last name",
    type: "text",
    autoComplete: "family-name",
    required: true,
    half: true,
  },
  {
    name: "company",
    label: "Company name",
    type: "text",
    autoComplete: "organization",
  },
  {
    name: "address",
    label: "Street address",
    type: "text",
    autoComplete: "address-line1",
    required: true,
  },
  {
    name: "address2",
    label: "Apartment, suite, unit, etc.",
    type: "text",
    autoComplete: "address-line2",
  },
  {
    name: "suburb",
    label: "Suburb",
    type: "text",
    autoComplete: "address-level2",
    required: true,
  },
];

/** After State, which is a list rather than a box to type in. */
const FIELDS_AFTER_STATE: typeof FIELDS = [
  {
    name: "postcode",
    label: "Postcode",
    type: "text",
    autoComplete: "postal-code",
    required: true,
    half: true,
    inputMode: "numeric",
  },
  {
    name: "phone",
    label: "Phone",
    type: "tel",
    autoComplete: "tel",
    required: true,
    half: true,
  },
  {
    name: "email",
    label: "Email address",
    type: "email",
    autoComplete: "email",
    required: true,
    half: true,
  },
];

/** The payment as the server created it. Every figure here is what is charged. */
type Payment = {
  clientSecret: string;
  partsCents: number;
  freightCents: number;
  totalCents: number;
};

export default function Checkout({
  initialDetails,
}: {
  /** The signed-in customer's saved details, or null for a guest. */
  initialDetails?: BillingDetails | null;
}) {
  const { lines } = useCart();
  const [details, setDetails] = useState<BillingDetails>(
    initialDetails ?? NO_DETAILS,
  );
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
  const [, startQuoting] = useTransition();
  /*
    Whether a quote has ever come back in this session.

    A ref rather than state, deliberately: the effect below reads it to decide
    whether to debounce, and anything it reads from state would have to be a
    dependency, which would re-run the effect on every answer and quote forever
    in a loop.
  */
  const hasQuoted = useRef(false);
  /* Set once the server has created the payment, which is what moves the page on. */
  const [payment, setPayment] = useState<Payment | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [starting, startingPayment] = useTransition();

  const complete = detailsComplete(details);

  function setField(name: keyof BillingDetails, value: string) {
    setDetails((current) => ({ ...current, [name]: value }));
  }

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
        ...details,
        // Checked by detailsComplete before this can run, and again on the server.
        state: details.state as AuState,
      });

      if (result.ok) setPayment(result);
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
    True from the moment the address is worth quoting until an answer for that
    exact address is on screen. `pending` alone misses the debounce, which is
    most of a second at the start and after every keystroke.
  */
  const waiting = deliverable && !pickup && !quote;

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
      Debounced by nearly a second while somebody is typing: each run is a
      request to a paid service, and a suburb and postcode are typed one after
      the other, so waiting means one quote for the pair rather than one for
      every intermediate state.

      But the first quote does not wait. A signed-in customer arrives with the
      address already filled in and has typed nothing, so there is nothing to
      debounce and no reason to make them look at "Calculating" for an extra
      second before the request has even left.
    */
    const delay = hasQuoted.current ? 900 : 0;

    const timer = setTimeout(() => {
      startQuoting(async () => {
        const quote = await quoteCheckout({
          lines: identifiers,
          pickup,
          suburb: details.suburb.trim(),
          postcode: details.postcode.trim(),
        });
        hasQuoted.current = true;
        setAnswered({ key, quote });
      });
    }, delay);

    return () => clearTimeout(timer);
  }, [
    lines,
    pickup,
    details.suburb,
    details.postcode,
    deliverable,
    requestKey,
  ]);

  /*
    On a phone the button that moves the page on is at the very bottom of it, so
    without this the next step opens with the customer looking at its last
    screenful.
  */
  const inPayment = payment !== null;
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [inPayment]);

  if (lines.length === 0) {
    return (
      <div className="bg-admin flex min-h-[60vh] flex-col items-center justify-center px-6 text-center text-white">
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
    <div className="bg-admin py-10 pb-16 text-white md:pb-24">
      <Container>
        <header className="mb-8">
          <CheckoutSteps current={payment ? 3 : 2} />
          <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">
            {payment ? "Payment" : "Checkout"}
          </h1>
          <p className="mt-2 text-sm text-gray-400 md:text-base">
            {payment
              ? "Check your order and pay by card."
              : "Fill in your details and we will price the freight before you pay."}
          </p>
        </header>

        {payment ? (
          <PaymentStage
            payment={payment}
            details={details}
            pickup={pickup}
            lines={lines}
            quote={quote}
            paying={paying}
            onPayingChange={setPaying}
            onChangeDetails={() => setPayment(null)}
          />
        ) : (
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            <Panel title="Billing details" className="w-full flex-1">
              <div className="grid gap-4 sm:grid-cols-2">
                {FIELDS.map((field) => (
                  <Field
                    key={field.name}
                    field={field}
                    value={details[field.name]}
                    onChange={setField}
                  />
                ))}

                <div>
                  <FieldLabel htmlFor="checkout-state" label="State" required />
                  <div className="relative">
                    <select
                      id="checkout-state"
                      name="state"
                      required
                      autoComplete="address-level1"
                      value={details.state}
                      onChange={(event) =>
                        setField("state", event.target.value)
                      }
                      className={`focus:border-brand border-line bg-field box-border w-full min-w-0 appearance-none rounded-xl border p-3 pr-9 text-base transition-colors focus:outline-none ${
                        details.state ? "text-white" : "text-gray-500"
                      }`}
                    >
                      <option value="">Select</option>
                      {AU_STATES.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                    <ChevronDownIcon
                      className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-gray-500"
                      aria-hidden="true"
                    />
                  </div>
                </div>

                {FIELDS_AFTER_STATE.map((field) => (
                  <Field
                    key={field.name}
                    field={field}
                    value={details[field.name]}
                    onChange={setField}
                  />
                ))}

                <div className="sm:col-span-2">
                  <FieldLabel htmlFor="checkout-notes" label="Order notes" />
                  <textarea
                    id="checkout-notes"
                    name="notes"
                    rows={4}
                    maxLength={MAX_NOTES}
                    value={details.notes}
                    onChange={(event) => setField("notes", event.target.value)}
                    placeholder="Notes about your order, e.g. special notes for delivery"
                    className="focus:border-brand border-line bg-field box-border w-full min-w-0 resize-none rounded-xl border p-3 text-base text-white placeholder-gray-600 transition-colors focus:outline-none"
                  />
                </div>
              </div>
            </Panel>

            <Panel
              title="Your order"
              className="w-full lg:sticky lg:top-24 lg:w-[26rem] lg:shrink-0"
            >
              {/*
                What you are buying, before anything is priced. This list used
                to appear only once a freight quote came back, so up to that
                point a checkout page showed a total and no way to see what it
                was for.
              */}
              <OrderLines lines={lines} quote={quote} />

              {/*
                A choice, not a field. On a card the same colour as the inputs
                with the same border, this read as one more empty box to fill
                in.
              */}
              <fieldset className="mb-5 space-y-3">
                <legend className="sr-only">How do you want it?</legend>
                <Choice
                  selected={!pickup}
                  onSelect={() => setPickup(false)}
                  title="Deliver to my address"
                  detail="Priced from your suburb and postcode"
                  price={
                    !pickup && quote?.ok && !quote.freightUnavailable
                      ? quote.freight
                      : undefined
                  }
                />
                <Choice
                  selected={pickup}
                  onSelect={() => setPickup(true)}
                  title="Pick up from Berkeley Vale"
                  detail={site.address.displayLine}
                  price="Free"
                />
              </fieldset>

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
                        : /*
                            Waiting counts as calculating.

                            This used to fall through to "Not available"
                            whenever there was no answer yet and no request in
                            flight, which is the whole debounce window. So a
                            checkout with the address already filled in said
                            delivery was not available before it had tried, and
                            only became a price ten seconds later. It read as
                            broken, and the fix people found was to edit the
                            postcode.
                          */
                          waiting
                          ? "Calculating..."
                          : quote?.ok
                            ? quote.freight
                            : "Not available"
                  }
                  muted={!quote?.ok || waiting}
                />
                <div className="border-line mt-2 flex items-center justify-between gap-4 border-t pt-3">
                  <span className="text-base font-semibold">Total</span>
                  {quote?.ok && !quote.freightUnavailable ? (
                    <span className="text-2xl font-extrabold tabular-nums">
                      {quote.total}
                    </span>
                  ) : quote?.ok && quote.freightUnavailable ? (
                    <span className="text-right">
                      <span className="block text-2xl font-extrabold tabular-nums text-gray-500">
                        {quote.total}
                      </span>
                      <span className="block text-xs font-medium text-amber-400">
                        delivery not included
                      </span>
                    </span>
                  ) : (
                    <span className="text-right">
                      <span className="block text-2xl font-extrabold tabular-nums text-gray-500">
                        {formatCents(indicativeSubtotal)}
                      </span>
                      <span className="block text-xs font-medium text-gray-500">
                        {pickup ? "nothing to add" : "plus delivery"}
                      </span>
                    </span>
                  )}
                </div>
              </div>

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
                  <p className="mb-4 rounded-xl border-line border bg-field p-4 text-sm text-gray-300">
                    One of these parts has not been weighed yet, so the delivery
                    price above is an estimate. We will confirm it before it
                    ships and let you know if it changes.
                  </p>
                )}

              {quote?.ok && quote.freightUnavailable && (
                <p className="mb-4 rounded-xl border-line border bg-field p-4 text-sm text-gray-300">
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
                <p className="mb-4 rounded-xl border-line border bg-field p-4 text-sm text-gray-300">
                  {quote.message}
                </p>
              )}

              <PaymentStep
                ready={
                  Boolean(quote?.ok && !quote.freightUnavailable) && complete
                }
                starting={starting}
                error={paymentError}
                onPay={beginPayment}
              />
            </Panel>
          </div>
        )}
      </Container>
    </div>
  );
}

/**
 * The last step: their details, then the order, with the card at the end, the
 * owner's choice of order, so a customer checks what they are buying before they
 * are asked for a card.
 */
function PaymentStage({
  payment,
  details,
  pickup,
  lines,
  quote,
  paying,
  onPayingChange,
  onChangeDetails,
}: {
  payment: Payment;
  details: BillingDetails;
  pickup: boolean;
  lines: CartLine[];
  quote: CheckoutQuote | null;
  paying: boolean;
  onPayingChange: (paying: boolean) => void;
  onChangeDetails: () => void;
}) {
  const name = fullName(details);
  const notes = details.notes.trim();
  const place = [details.suburb, details.state, details.postcode]
    .map((part) => part.trim())
    .join(" ");
  const line2 = details.address2.trim();

  return (
    <>
      <section className="border-line bg-card rounded-2xl border p-6 md:p-7">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-sm font-bold tracking-wide text-white uppercase">
            Your details
          </h2>
          <button
            type="button"
            onClick={onChangeDetails}
            disabled={paying}
            className="text-brand-text text-sm font-semibold transition-colors hover:text-white disabled:opacity-60"
          >
            Change my details
          </button>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          <Detail label={pickup ? "Picking up from" : "Delivering to"}>
            {pickup ? (
              site.address.displayLine
            ) : (
              <>
                {name}
                {details.company.trim() && (
                  <>
                    <br />
                    {details.company.trim()}
                  </>
                )}
                <br />
                {details.address.trim()}
                {line2 && (
                  <>
                    <br />
                    {line2}
                  </>
                )}
                <br />
                {place}
              </>
            )}
          </Detail>
          <Detail label="Contact">
            {pickup && (
              <>
                {name}
                <br />
              </>
            )}
            {details.phone.trim()}
            <br />
            {details.email.trim()}
          </Detail>
          <Detail label="Order notes">{notes || "None"}</Detail>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2 lg:items-start">
        <Panel title="Your order">
          <OrderLines lines={lines} quote={quote} />
          <div className="space-y-2">
            <Line
              label="Parts"
              value={formatCents(payment.partsCents)}
              muted={false}
            />
            <Line
              label={pickup ? "Pickup" : "Delivery"}
              value={pickup ? "Free" : formatCents(payment.freightCents)}
              muted={false}
            />
            <div className="border-line mt-2 flex items-center justify-between gap-4 border-t pt-3">
              <span className="text-base font-semibold">Total</span>
              <span className="text-2xl font-extrabold tabular-nums">
                {formatCents(payment.totalCents)}
              </span>
            </div>
          </div>
        </Panel>

        <Panel title="Card details">
          <PaymentPanel
            clientSecret={payment.clientSecret}
            amount={formatCents(payment.totalCents)}
            billing={{
              name,
              email: details.email.trim(),
              phone: details.phone.trim(),
              address: {
                line1: details.address.trim(),
                ...(line2 ? { line2 } : {}),
                city: details.suburb.trim(),
                state: details.state,
                postal_code: details.postcode.trim(),
                country: "AU",
              },
            }}
            onPayingChange={onPayingChange}
          />
        </Panel>
      </div>
    </>
  );
}

function Panel({
  title,
  className = "",
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`border-line bg-card min-w-0 rounded-2xl border p-6 md:p-7 ${className}`}
    >
      <h2 className="mb-5 text-sm font-bold tracking-wide text-white uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

function FieldLabel({
  htmlFor,
  label,
  required,
}: {
  htmlFor: string;
  label: string;
  required?: boolean;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-sm font-semibold text-gray-300"
    >
      {label}
      {required ? (
        <span className="text-brand-text" aria-hidden="true">
          {" "}
          *
        </span>
      ) : (
        <span className="font-normal text-gray-500"> (optional)</span>
      )}
    </label>
  );
}

function Field({
  field,
  value,
  onChange,
}: {
  field: (typeof FIELDS)[number];
  value: string;
  onChange: (name: keyof BillingDetails, value: string) => void;
}) {
  const id = `checkout-${field.name}`;

  return (
    <div className={field.half ? "" : "sm:col-span-2"}>
      <FieldLabel htmlFor={id} label={field.label} required={field.required} />
      <input
        id={id}
        name={field.name}
        type={field.type}
        required={field.required}
        inputMode={field.inputMode}
        autoComplete={field.autoComplete}
        value={value}
        onChange={(event) => onChange(field.name, event.target.value)}
        className="focus:border-brand border-line bg-field box-border w-full min-w-0 rounded-xl border p-3 text-base text-white placeholder-gray-600 transition-colors focus:outline-none"
      />
    </div>
  );
}

function OrderLines({
  lines,
  quote,
}: {
  lines: CartLine[];
  quote: CheckoutQuote | null;
}) {
  const quoted = quote?.ok ? quote.lines : null;

  return (
    <ul className="border-line mb-5 space-y-3 border-b pb-5">
      {lines.map((line) => {
        const priced = quoted?.find((candidate) =>
          isSameLine(candidate, line),
        );
        // Sold since it went in the cart. The problems list says so.
        if (quoted && !priced) return null;

        return (
          <li
            key={`${line.urgId}-${line.invNumber}`}
            className="flex items-center gap-3"
          >
            <PartThumbnail
              src={line.thumbnail ?? PART_IMAGE_PLACEHOLDER}
              alt={line.itemName}
              className="bg-field border-line h-12 w-12 shrink-0 rounded-lg border object-cover"
            />
            <span className="min-w-0 flex-1 text-sm text-gray-200">
              {line.itemName}
              <span className="block text-xs text-gray-500">
                {lineVehicle(line)}
              </span>
            </span>
            <span className="shrink-0 text-sm font-semibold tabular-nums">
              {priced?.parts ?? formatCents(Math.round(line.price * 100))}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function Choice({
  selected,
  onSelect,
  title,
  detail,
  price,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  detail: string;
  price?: string;
}) {
  return (
    <label
      className={`has-focus-visible:border-white flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors ${
        selected ? "border-brand bg-field" : "border-line hover:border-white/25"
      }`}
    >
      <input
        type="radio"
        name="fulfilment"
        checked={selected}
        onChange={onSelect}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
          selected ? "border-brand" : "border-gray-600"
        }`}
      >
        {selected && <span className="bg-brand h-2 w-2 rounded-full" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-white">{title}</span>
        <span className="block text-xs text-gray-500">{detail}</span>
      </span>
      {price && (
        <span className="shrink-0 text-sm font-semibold tabular-nums">
          {price}
        </span>
      )}
    </label>
  );
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-xs font-bold tracking-wide text-gray-500 uppercase">
        {label}
      </p>
      <div className="text-sm leading-relaxed break-words whitespace-pre-line text-gray-200">
        {children}
      </div>
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
    <div className="flex justify-between gap-4 text-sm md:text-base">
      <span className="text-gray-400">{label}</span>
      <span
        className={`text-right tabular-nums ${muted ? "text-gray-500" : "text-gray-200"}`}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * Where the card form goes.
 *
 * Everything up to this point works: the order is priced, the freight is
 * quoted, and the total shown is the total the payment would be created from.
 * Taking the money needs Stripe keys, so a build without them says so and offers
 * the phone rather than pretending.
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
      <div className="mt-auto rounded-xl border-line border bg-admin p-5">
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
          className="mb-3 rounded-xl border-line border bg-field p-3 text-sm text-gray-200"
        >
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={onPay}
        disabled={!ready || starting}
        className="bg-brand hover:bg-brand-hover w-full rounded-xl px-4 py-3.5 text-sm font-semibold tracking-wide text-white uppercase transition-colors disabled:opacity-50"
      >
        {starting ? "Preparing..." : "Continue to payment"}
      </button>

      {ready ? (
        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-gray-500">
          <LockClosedIcon className="h-3.5 w-3.5" aria-hidden="true" />
          Secure card payment by Stripe
        </p>
      ) : (
        <p className="mt-2 text-center text-xs text-gray-500">
          Fill in your details to continue.
        </p>
      )}
    </div>
  );
}

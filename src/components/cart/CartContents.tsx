"use client";

import Link from "next/link";
import {
  LockClosedIcon,
  MapPinIcon,
  TruckIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import CheckoutSteps from "@/components/checkout/CheckoutSteps";
import Container from "@/components/layout/Container";
import PartThumbnail from "@/components/parts/PartThumbnail";
import { useCart } from "@/lib/cart/CartProvider";
import { lineVehicle } from "@/lib/cart/types";
import { PART_IMAGE_PLACEHOLDER } from "@/lib/parts/images";
import { formatCents } from "@/lib/parts/price";

/**
 * The cart.
 *
 * Runs in the browser because that is where the cart lives: it is kept in
 * localStorage so somebody can put a gearbox aside, close the tab and come back
 * to it without an account.
 *
 * Every figure here is indicative. The prices shown are the ones the catalogue
 * had when each part was added, and the server re-prices the whole order from
 * the catalogue before anything is charged. A total that arrives from a browser
 * is a total a customer can edit.
 *
 * There are no quantity buttons, at the owner's request. A listing is one part
 * off one car, so "+" only ever offered a second part that does not exist.
 */

export default function CartContents() {
  const { lines, count, subtotal, remove, clear } = useCart();

  if (lines.length === 0) {
    return (
      <div className="bg-admin flex min-h-[60vh] flex-col items-center justify-center px-6 text-center text-white">
        <h1 className="mb-3 text-3xl font-bold">Your cart is empty</h1>
        <p className="mb-8 max-w-md text-sm text-gray-400">
          Nothing put aside yet. We hold about 32,000 parts, so there is a fair
          chance we have what you are after.
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

  return (
    <div className="bg-admin py-10 pb-16 text-white md:pb-24">
      <Container>
        <header className="mb-8">
          <CheckoutSteps current={1} />
          {/* One colour, like every other heading on the site. */}
          <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">
            Your cart
          </h1>
          <p className="mt-2 text-sm text-gray-400 md:text-base">
            {count} {count === 1 ? "item" : "items"}. Delivery is priced at
            checkout, once we know where it is going.
          </p>
        </header>

        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1">
            <div className="border-line bg-card rounded-2xl border">
              <div className="border-line hidden grid-cols-[1fr_6rem_2rem] gap-4 border-b px-6 py-4 text-xs font-bold tracking-wide text-gray-400 uppercase sm:grid">
                <span>Part</span>
                <span className="text-right">Price</span>
                <span />
              </div>

              <ul>
                {lines.map((line, index) => {
                  const href = `/product/${line.urgId}/${line.invNumber}`;
                  const vehicle = lineVehicle(line);

                  return (
                    <li
                      key={`${line.urgId}-${line.invNumber}`}
                      className={`grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-3 p-5 sm:grid-cols-[1fr_6rem_2rem] sm:px-6 ${
                        index > 0 ? "border-line border-t" : ""
                      }`}
                    >
                      <div className="col-span-2 flex min-w-0 items-center gap-4 sm:col-span-1">
                        <Link
                          href={href}
                          className="shrink-0"
                          aria-label={line.itemName}
                        >
                          <PartThumbnail
                            src={line.thumbnail ?? PART_IMAGE_PLACEHOLDER}
                            alt={line.itemName}
                            className="bg-field border-line h-20 w-20 rounded-xl border object-cover transition hover:opacity-90"
                          />
                        </Link>
                        <div className="min-w-0">
                          <h2 className="font-semibold md:text-lg">
                            <Link
                              href={href}
                              className="hover:text-brand-text transition-colors"
                            >
                              {line.itemName}
                            </Link>
                          </h2>
                          {vehicle && (
                            <p className="text-sm text-gray-400">{vehicle}</p>
                          )}
                          {line.stockNo && (
                            <p className="text-xs text-gray-500">
                              Stock no. {line.stockNo}
                            </p>
                          )}
                        </div>
                      </div>

                      <p className="font-bold tabular-nums sm:text-right">
                        {formatCents(Math.round(line.price * 100))}
                      </p>

                      <button
                        type="button"
                        onClick={() => remove(line)}
                        aria-label={`Remove ${line.itemName}`}
                        className="hover:text-brand-text flex justify-end text-gray-500 transition-colors"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="mt-4 flex items-center justify-between gap-4 text-sm">
              <Link
                href="/products"
                className="font-semibold text-gray-300 transition-colors hover:text-white"
              >
                &larr; Continue shopping
              </Link>
              {/*
                Quiet, and it asks first. Emptying the cart had the same weight
                as the button people are meant to press, and did it on one
                click.
              */}
              <button
                type="button"
                onClick={() => {
                  if (confirm("Empty your cart? This cannot be undone.")) clear();
                }}
                className="font-semibold text-gray-500 transition-colors hover:text-gray-300"
              >
                Empty cart
              </button>
            </div>
          </div>

          <aside className="w-full lg:w-96 lg:shrink-0">
            <div className="border-line bg-card rounded-2xl border p-6 md:p-7 lg:sticky lg:top-24">
              <h2 className="mb-5 text-sm font-bold tracking-wide text-white uppercase">
                Cart totals
              </h2>

              <div className="space-y-3">
                <Row
                  label={count === 1 ? "1 item" : `${count} items`}
                  value={formatCents(Math.round(subtotal * 100))}
                />
                <Row
                  label="Delivery"
                  value="Priced at checkout"
                  hint="Worked out from your address and the size of the parts"
                />
              </div>

              {/*
                One figure, once. This panel used to print the same subtotal
                twice under two different labels, which reads as though one of
                them ought to be a different number.
              */}
              <div className="border-line mt-4 flex items-center justify-between border-t pt-4">
                <p className="text-base font-semibold">Total so far</p>
                <p className="text-2xl font-extrabold tabular-nums text-white">
                  {formatCents(Math.round(subtotal * 100))}
                </p>
              </div>

              <Link
                href="/place-order"
                className="bg-brand hover:bg-brand-hover mt-5 block w-full rounded-xl px-4 py-3.5 text-center text-sm font-semibold tracking-wide text-white uppercase transition-colors"
              >
                Proceed to Checkout
              </Link>

              <ul className="border-line mt-5 space-y-2.5 border-t pt-5 text-sm text-gray-400">
                <Assurance icon={TruckIcon}>Nationwide delivery</Assurance>
                <Assurance icon={MapPinIcon}>
                  Or pick up from Berkeley Vale
                </Assurance>
                <Assurance icon={LockClosedIcon}>
                  Secure card payment by Stripe
                </Assurance>
              </ul>
            </div>
          </aside>
        </div>
      </Container>
    </div>
  );
}

function Assurance({
  icon: Icon,
  children,
}: {
  icon: typeof TruckIcon;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-2.5">
      <Icon className="text-brand-text h-4 w-4 shrink-0" aria-hidden="true" />
      {children}
    </li>
  );
}

function Row({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex justify-between gap-4 text-sm md:text-base">
      <p className="text-gray-400">{label}</p>
      <p className="max-w-[60%] text-right tabular-nums" title={hint}>
        {value}
      </p>
    </div>
  );
}

"use client";

import Link from "next/link";
import Container from "@/components/layout/Container";
import PartThumbnail from "@/components/parts/PartThumbnail";
import { useCart } from "@/lib/cart/CartProvider";
import { PART_IMAGE_PLACEHOLDER } from "@/lib/parts/images";
import { formatCents } from "@/lib/parts/price";
import type { CartLine } from "@/lib/cart/types";

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
 */

/** The supplier's cap, and more of one part than the yard is likely to hold. */
const MAX_QUANTITY = 20;

export default function CartContents() {
  const { lines, count, subtotal, remove, setQuantity, clear } = useCart();

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
          {/* One colour, like every other heading on the site. */}
          <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">
            Your cart
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            {count} {count === 1 ? "item" : "items"}. Delivery is priced at
            checkout, once we know where it is going.
          </p>
        </header>

        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          <ul className="flex-1 space-y-4">
            {lines.map((line) => (
              <li
                key={`${line.urgId}-${line.invNumber}`}
                className="border-line bg-card flex flex-col items-start gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center sm:gap-5"
              >
                <Link
                  href={`/product/${line.urgId}/${line.invNumber}`}
                  className="shrink-0"
                  aria-label={line.itemName}
                >
                  <PartThumbnail
                    src={line.thumbnail ?? PART_IMAGE_PLACEHOLDER}
                    alt={line.itemName}
                    className="bg-field border-line h-24 w-24 rounded-xl border object-cover transition hover:opacity-90"
                  />
                </Link>

                <div className="min-w-0 flex-1">
                  <h2 className="mb-1 text-base font-semibold md:text-lg">
                    <Link
                      href={`/product/${line.urgId}/${line.invNumber}`}
                      className="hover:text-brand-text transition-colors"
                    >
                      {line.itemName}
                    </Link>
                  </h2>
                  <Detail label="Manufacturer" value={line.manufacturer} />
                  <Detail label="Model" value={line.model} />
                  <p className="mt-2 text-base font-bold tabular-nums text-white md:text-lg">
                    {formatCents(Math.round(line.price * 100))}
                    {line.quantity > 1 && (
                      <span className="ml-2 text-xs font-medium text-gray-500">
                        each
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-4 self-stretch sm:ml-auto sm:self-auto">
                  <div className="text-right">
                    <Quantity line={line} onChange={setQuantity} />
                    {line.quantity > 1 && (
                      <p className="mt-2 text-sm font-bold tabular-nums">
                        {formatCents(
                          Math.round(line.price * 100) * line.quantity,
                        )}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(line)}
                    className="hover:text-brand-text rounded-lg px-2 py-2 text-xs font-semibold text-gray-500 transition-colors hover:bg-white/5"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <aside className="w-full lg:w-96 lg:shrink-0">
            <div className="border-line bg-card rounded-2xl border p-6 lg:sticky lg:top-24">
              <h2 className="mb-5 text-sm font-bold tracking-wide text-white uppercase">
                Summary
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
                <p className="text-xl font-extrabold tabular-nums text-white">
                  {formatCents(Math.round(subtotal * 100))}
                </p>
              </div>

              <Link
                href="/place-order"
                className="bg-brand hover:bg-brand-hover mt-5 block w-full rounded-xl px-4 py-3.5 text-center text-sm font-semibold tracking-wide text-white uppercase transition-colors"
              >
                Proceed to Checkout
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
                className="mt-3 w-full rounded-lg px-4 py-2 text-xs font-semibold text-gray-500 transition-colors hover:bg-white/5 hover:text-gray-300"
              >
                Empty cart
              </button>
            </div>
          </aside>
        </div>
      </Container>
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <p className="text-xs text-gray-400 md:text-sm">
      {label}: <span className="text-gray-200">{value}</span>
    </p>
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
    <div className="flex justify-between gap-4 text-sm">
      <p className="text-gray-400">{label}</p>
      <p
        className="max-w-[60%] text-right font-semibold tabular-nums"
        title={hint}
      >
        {value}
      </p>
    </div>
  );
}

function Quantity({
  line,
  onChange,
}: {
  line: CartLine;
  onChange: (line: CartLine, quantity: number) => void;
}) {
  return (
    <div className="flex items-center overflow-hidden rounded-full border-line border bg-field">
      <Step
        label={`Fewer ${line.itemName}`}
        disabled={line.quantity <= 1}
        onClick={() => onChange(line, line.quantity - 1)}
      >
        &minus;
      </Step>
      <span
        aria-live="polite"
        className="px-4 text-sm font-semibold md:text-base"
      >
        {line.quantity}
      </span>
      <Step
        label={`More ${line.itemName}`}
        disabled={line.quantity >= MAX_QUANTITY}
        onClick={() => onChange(line, line.quantity + 1)}
      >
        +
      </Step>
    </div>
  );
}

function Step({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="px-3 py-2 text-lg font-bold text-white transition-colors hover:bg-gray-700 disabled:opacity-40"
    >
      {children}
    </button>
  );
}

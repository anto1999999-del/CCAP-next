"use client";

import Link from "next/link";
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
      <div className="bg-surface flex min-h-[60vh] flex-col items-center justify-center px-6 text-center text-white">
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
    <div className="min-h-screen bg-[#050509] px-4 py-10 text-white md:px-8 lg:px-16">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-wide md:text-4xl lg:text-5xl">
          Your <span className="text-brand-text">Shopping Cart</span>
        </h1>
        <p className="mt-2 text-sm text-gray-400 md:text-base">
          Review your items, adjust quantities, and proceed to secure checkout.
        </p>
      </header>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <ul className="flex-1 space-y-4">
          {lines.map((line) => (
            <li
              key={`${line.urgId}-${line.invNumber}`}
              className="flex flex-col items-start gap-4 rounded-xl border border-gray-800 bg-[#151518] p-5 shadow-lg md:flex-row md:items-center md:gap-6"
            >
              <Link
                href={`/product/${line.urgId}/${line.invNumber}`}
                className="shrink-0"
                aria-label={line.itemName}
              >
                <PartThumbnail
                  src={line.thumbnail ?? PART_IMAGE_PLACEHOLDER}
                  alt={line.itemName}
                  className="h-28 w-28 rounded-lg bg-[#0d0d0d] object-cover transition hover:opacity-90"
                />
              </Link>

              <div className="flex-1">
                <h2 className="mb-1 text-lg font-semibold md:text-xl">
                  <Link
                    href={`/product/${line.urgId}/${line.invNumber}`}
                    className="hover:text-brand-text transition-colors"
                  >
                    {line.itemName}
                  </Link>
                </h2>
                <Detail label="Manufacturer" value={line.manufacturer} />
                <Detail label="Model" value={line.model} />
                <p className="text-brand-text mt-2 text-lg font-bold md:text-xl">
                  {formatCents(Math.round(line.price * 100))}
                </p>
              </div>

              <div className="flex items-center gap-4 self-stretch md:ml-auto md:self-auto">
                <Quantity line={line} onChange={setQuantity} />
                <button
                  type="button"
                  onClick={() => remove(line)}
                  className="bg-brand hover:bg-brand-hover rounded-full px-4 py-2 text-xs font-semibold tracking-wide text-white uppercase transition-colors md:text-sm"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>

        <aside className="w-full lg:w-80">
          <div className="space-y-4 rounded-2xl border border-gray-800 bg-[#151518] p-6 shadow-xl">
            <h2 className="mb-2 text-xl font-bold md:text-2xl">Cart Summary</h2>

            <Row label="Total Items" value={String(count)} />
            <Row
              label="Total Price"
              value={formatCents(Math.round(subtotal * 100))}
            />
            <Row
              label="Shipping"
              value="At checkout"
              hint="Calculated from your address and the size of the parts"
            />

            <div className="mt-2 flex items-center justify-between border-t border-gray-700 pt-2">
              <p className="text-sm text-gray-300 md:text-base">Subtotal</p>
              <p className="text-xl font-bold text-white">
                {formatCents(Math.round(subtotal * 100))}
              </p>
            </div>

            <div className="space-y-3 pt-4">
              <button
                type="button"
                onClick={clear}
                className="w-full rounded-full border border-gray-700 px-4 py-3 text-sm font-semibold tracking-wide text-gray-200 uppercase transition-colors hover:bg-gray-800 md:text-base"
              >
                Clear Cart
              </button>
              <Link
                href="/place-order"
                className="bg-brand hover:bg-brand-hover shadow-brand/40 block w-full rounded-full px-4 py-3 text-center text-sm font-semibold tracking-wide text-white uppercase shadow-lg transition-colors md:text-base"
              >
                Proceed to Checkout
              </Link>
            </div>
          </div>
        </aside>
      </div>
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
    <div className="flex justify-between text-sm md:text-base">
      <p className="text-gray-400">{label}</p>
      <p className="max-w-[60%] text-right font-semibold" title={hint}>
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
    <div className="flex items-center overflow-hidden rounded-full border border-gray-700 bg-[#101015]">
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

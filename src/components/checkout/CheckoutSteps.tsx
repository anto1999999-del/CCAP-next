import { CheckIcon } from "@heroicons/react/24/outline";

const STEPS = ["Cart", "Your details", "Payment"];

/**
 * Where the customer is in the only three steps there are.
 *
 * Shown on the cart as well as the checkout, because knowing that payment is
 * two steps away, not ten, is what keeps somebody going past the cart.
 */
export default function CheckoutSteps({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="mb-6 flex items-center gap-2 text-xs font-semibold sm:gap-3 sm:text-sm">
      {STEPS.map((label, index) => {
        const number = index + 1;
        const done = number < current;
        const active = number === current;

        return (
          <li
            key={label}
            aria-current={active ? "step" : undefined}
            className="flex items-center gap-2 sm:gap-3"
          >
            {index > 0 && (
              <span className="bg-line h-px w-4 sm:w-8" aria-hidden="true" />
            )}
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full ${
                active || done
                  ? "bg-brand text-white"
                  : "border-line border text-gray-500"
              }`}
            >
              {done ? <CheckIcon className="h-3.5 w-3.5" /> : number}
            </span>
            <span className={active ? "text-white" : "text-gray-500"}>
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

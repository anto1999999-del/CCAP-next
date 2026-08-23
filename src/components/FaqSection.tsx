"use client";

import { useState } from "react";
import type { Faq } from "@/lib/faqs";

/**
 * Accordion of frequently asked questions.
 *
 * Every answer stays in the DOM at all times and is collapsed with CSS
 * (`max-h-0` plus `opacity-0`) rather than being conditionally rendered. That
 * is deliberate and must not be "tidied up": these answers are published as
 * FAQPage structured data and can appear directly in search results, so they
 * need to be present in the markup whether or not a visitor has opened them.
 *
 * `hidden` is driven by the same state so assistive technology does not
 * announce collapsed answers, while crawlers still read them.
 */
export default function FaqSection({
  faqs,
  intro = "Everything you need to know about Central Coast Auto Parts",
  /**
   * The gradient starts from whichever surface the preceding section ended on,
   * so the seam is invisible: Home comes off #050505, Contact off #1c1c1c.
   *
   * Passed as a complete class rather than a colour, because Tailwind generates
   * utilities by scanning source text — it can only produce `from-[#1c1c1c]` if
   * that exact string appears somewhere it reads. Both variants are therefore
   * written out literally: the default here, and the override at the call site.
   */
  fromClass = "from-[#050505]",
}: {
  faqs: readonly Faq[];
  intro?: string;
  fromClass?: string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className={`bg-gradient-to-b ${fromClass} to-black py-16 md:py-20`}>
      <div className="mx-auto max-w-4xl px-4 md:px-8 lg:px-16">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl lg:text-5xl">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-gray-400">{intro}</p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            const panelId = `faq-panel-${index}`;
            const buttonId = `faq-button-${index}`;

            return (
              <div
                key={faq.question}
                className={`overflow-hidden rounded-xl border bg-[#2a2a2a] transition-all duration-300 ${
                  isOpen
                    ? "border-brand shadow-brand/20 shadow-lg"
                    : "border-gray-700 hover:border-gray-600 hover:shadow-md"
                }`}
              >
                <button
                  id={buttonId}
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="group flex w-full items-center justify-between p-5 text-left md:p-6"
                >
                  <span
                    className={`pr-4 text-base font-semibold transition-colors md:text-lg ${
                      isOpen ? "text-brand-text" : "group-hover:text-brand-text text-white"
                    }`}
                  >
                    {faq.question}
                  </span>
                  <span
                    className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
                      isOpen
                        ? "bg-brand rotate-180"
                        : "group-hover:bg-brand/50 bg-gray-700"
                    }`}
                  >
                    <svg
                      className="h-5 w-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </span>
                </button>

                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  className={`overflow-hidden transition-all duration-300 ${
                    isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="px-5 pt-0 pb-5 md:px-6 md:pb-6">
                    <div className="border-t border-gray-700 pt-4">
                      <p className="text-base leading-relaxed text-gray-300 md:text-lg">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

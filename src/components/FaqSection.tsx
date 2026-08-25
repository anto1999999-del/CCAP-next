"use client";

import { useState } from "react";
import Container from "@/components/layout/Container";
import SectionHeading from "@/components/layout/SectionHeading";
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
 *
 * Two columns from the large breakpoint up. Eight questions in one column ran
 * most of a screen on its own and made three pages feel padded; the same eight
 * side by side take half the height and can be read at a glance. The list is
 * split into two independent stacks rather than laid out with CSS columns, so
 * opening a question moves only the column it is in.
 *
 * The section used to fade from a colour passed in by each page, because each
 * page ended on a different dark. They all end on the same one now, so it does
 * not fade from anything.
 */
export default function FaqSection({
  faqs,
  intro = "Everything you need to know about Central Coast Auto Parts",
}: {
  faqs: readonly Faq[];
  intro?: string;
}) {
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);

  const half = Math.ceil(faqs.length / 2);
  const columns = [faqs.slice(0, half), faqs.slice(half)];

  return (
    <div className="bg-admin py-14 text-white md:py-20">
      <Container>
        <SectionHeading
          className="mb-10 md:mb-12"
          title="Frequently Asked Questions"
          intro={intro}
        />

        <div className="mx-auto grid max-w-6xl items-start gap-4 lg:grid-cols-2 lg:gap-6">
          {columns.map((column, columnIndex) => (
            <div key={columnIndex} className="space-y-4">
              {column.map((faq) => {
                const isOpen = openQuestion === faq.question;
                /* Keyed on the question rather than an index, which restarts at
                   zero in the second column. */
                const id = faq.question
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")
                  .slice(0, 60);

                return (
                  <div
                    key={faq.question}
                    className={`overflow-hidden rounded-2xl border transition-colors ${
                      isOpen
                        ? "border-brand bg-card"
                        : "border-line bg-card hover:border-white/25"
                    }`}
                  >
                    <button
                      id={`faq-button-${id}`}
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={`faq-panel-${id}`}
                      onClick={() =>
                        setOpenQuestion(isOpen ? null : faq.question)
                      }
                      className="group flex w-full items-center justify-between gap-4 p-5 text-left"
                    >
                      <span
                        className={`text-sm font-semibold transition-colors md:text-base ${
                          isOpen
                            ? "text-brand-text"
                            : "group-hover:text-brand-text text-white"
                        }`}
                      >
                        {faq.question}
                      </span>
                      <span
                        className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full transition-transform duration-200 ${
                          isOpen ? "bg-brand rotate-180" : "border-line border"
                        }`}
                      >
                        <svg
                          className="h-4 w-4 text-white"
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
                      id={`faq-panel-${id}`}
                      role="region"
                      aria-labelledby={`faq-button-${id}`}
                      className={`overflow-hidden transition-all duration-300 ${
                        isOpen ? "max-h-[32rem] opacity-100" : "max-h-0 opacity-0"
                      }`}
                    >
                      <div className="px-5 pb-5">
                        <div className="border-line border-t pt-4">
                          <p className="text-sm leading-relaxed text-gray-400 md:text-base">
                            {faq.answer}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </Container>
    </div>
  );
}

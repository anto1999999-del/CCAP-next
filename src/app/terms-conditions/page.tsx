import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import ContactFormSection from "@/components/ContactFormSection";
import { breadcrumbSchema } from "@/lib/schema/breadcrumbs";
import { TERMS_SECTIONS } from "@/lib/content/terms";

/**
 * Terms and conditions.
 *
 * The live page has no metadata of its own, so it inherits the home page's
 * title and description — two pages telling Google they are the same thing,
 * which is a duplicate-content signal for nothing. It also has 23 `h2`
 * headings and no `h1`. Both are fixed here.
 *
 * Rendered entirely on the server. The original pulled in framer-motion to fade
 * the sections in on load, which meant shipping an animation library and making
 * the whole page a client component to animate static legal text. The finished
 * appearance is identical.
 */
export const metadata: Metadata = {
  title: "Terms & Conditions | Warranty & Returns | Central Coast Auto Parts",
  description:
    "Warranty, returns and purchase conditions for used car parts from Central Coast Auto Parts, Berkeley Vale NSW. 3-month parts warranty, 14-day returns.",
  alternates: { canonical: "/terms-conditions" },
};

/** Shared body type so every paragraph in a section matches. */
const BODY = "text-[15px] leading-relaxed text-gray-400 sm:text-base";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0d0d0d]">
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Terms & Conditions", path: "/terms-conditions" },
        ])}
      />

      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="mb-4 text-center text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Terms &amp; Conditions
        </h1>

        <p className="mx-auto mb-12 max-w-xl text-center text-sm leading-relaxed text-gray-400 sm:text-base">
          Please read these terms carefully. By purchasing from Central Coast
          Auto Parts you agree to the following conditions.
        </p>

        <div className="space-y-10">
          {TERMS_SECTIONS.map((section, index) => (
            <section
              key={section.title}
              className="border-brand/40 relative rounded-r-lg border-l-0 pl-0 sm:border-l-2 sm:pl-6"
            >
              {/*
                Headings request Prata and fall back to serif, because Prata is
                never actually loaded — there is no @font-face for it anywhere.
                Reproduced so the page renders exactly as it does today; see
                docs/DESIGN-NOTES.md.
              */}
              <h2
                className="mb-3 text-lg font-semibold tracking-tight text-white sm:text-xl"
                style={{ fontFamily: '"Prata", serif' }}
              >
                {index + 1}. {section.title}
              </h2>

              {section.intro && (
                <p className="mb-3 text-[15px] leading-relaxed text-gray-300 sm:text-base">
                  {section.intro}
                </p>
              )}

              {section.body && <p className={`${BODY} mb-3`}>{section.body}</p>}

              {section.clauses?.map((clause) => (
                <p key={clause} className={`${BODY} mb-3 last:mb-0`}>
                  {clause}
                </p>
              ))}

              {section.bulletsIntro && (
                <p className={`${BODY} mt-1 mb-2`}>{section.bulletsIntro}</p>
              )}

              {section.bullets && section.bullets.length > 0 && (
                <ul className={`${BODY} mb-3 list-outside list-disc space-y-1.5 pl-5`}>
                  {section.bullets.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              )}

              {section.footer && <p className={BODY}>{section.footer}</p>}
            </section>
          ))}
        </div>

        <footer className="mt-16 border-t border-gray-800 pt-8 text-center">
          <p className="text-sm text-gray-500">
            Last updated · Central Coast Auto Parts
          </p>
        </footer>
      </div>

      {/*
        The live site shows a contact form here, supplied by the footer, which
        rendered it on every page not named in two hardcoded lists. That block
        existed in two slightly different versions — the footer's and the one
        Home, About, Contact and Sell Your Car embedded directly — with
        different heading sizes and rule widths. One component is now used
        everywhere, so every page presents the same form.
      */}
      <ContactFormSection />
    </div>
  );
}

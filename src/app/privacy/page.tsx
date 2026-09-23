import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import ContactFormSection from "@/components/ContactFormSection";
import { breadcrumbSchema } from "@/lib/schema/breadcrumbs";
import { PRIVACY_SECTIONS, PRIVACY_UPDATED } from "@/lib/content/privacy";

/**
 * Privacy and cookie policy.
 *
 * The page the cookie banner links to, so it has to exist and be real. Same
 * server-rendered layout as the terms page, from a content module, so the two
 * legal pages stay consistent and neither ships client JavaScript.
 */
export const metadata: Metadata = {
  title: "Privacy & Cookie Policy | Central Coast Auto Parts",
  description:
    "How Central Coast Auto Parts collects, uses and protects your personal information, and the cookies used on centralcoastautoparts.com.au.",
  alternates: { canonical: "/privacy" },
};

const BODY = "text-[15px] leading-relaxed text-gray-400 sm:text-base";

export default function PrivacyPage() {
  return (
    <div className="bg-admin min-h-screen">
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Privacy & Cookie Policy", path: "/privacy" },
        ])}
      />

      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="mb-4 text-center text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Privacy &amp; Cookie Policy
        </h1>

        <p className="mx-auto mb-12 max-w-xl text-center text-sm leading-relaxed text-gray-400 sm:text-base">
          How we collect, use and protect your information, and the cookies this
          website uses.
        </p>

        <div className="space-y-10">
          {PRIVACY_SECTIONS.map((section, index) => (
            <section
              key={section.title}
              className="border-brand/40 relative rounded-r-lg border-l-0 pl-0 sm:border-l-2 sm:pl-6"
            >
              <h2 className="mb-3 text-lg font-semibold tracking-tight text-white sm:text-xl">
                {index + 1}. {section.title}
              </h2>

              {section.intro && (
                <p className="mb-3 text-[15px] leading-relaxed text-gray-300 sm:text-base">
                  {section.intro}
                </p>
              )}

              {section.body && <p className={`${BODY} mb-3`}>{section.body}</p>}

              {section.bulletsIntro && (
                <p className={`${BODY} mt-1 mb-2`}>{section.bulletsIntro}</p>
              )}

              {section.bullets && section.bullets.length > 0 && (
                <ul
                  className={`${BODY} mb-1 list-outside list-disc space-y-1.5 pl-5`}
                >
                  {section.bullets.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <footer className="border-line mt-16 border-t pt-8 text-center">
          <p className="text-sm text-gray-400">
            Last updated {PRIVACY_UPDATED} &middot; Central Coast Auto Parts
          </p>
        </footer>
      </div>

      <ContactFormSection />
    </div>
  );
}

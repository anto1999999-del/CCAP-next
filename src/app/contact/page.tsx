import type { Metadata } from "next";
import Image from "next/image";
import type { ReactNode } from "react";
import JsonLd from "@/components/JsonLd";
import FaqSection from "@/components/FaqSection";
import ContactFormSection from "@/components/ContactFormSection";
import Container from "@/components/layout/Container";
import { CONTACT_FAQS, faqSchema } from "@/lib/faqs";
import { breadcrumbSchema } from "@/lib/schema/breadcrumbs";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title:
    "Contact Us | Used Car Parts Berkeley Vale NSW | Central Coast Auto Parts",
  description:
    "Get in touch with Central Coast Auto Parts in Berkeley Vale NSW. Call 02 4388 1818, request a part quote, or visit us Mon, Fri 8am, 5pm, Sat 9am, 2pm.",
  alternates: { canonical: "/contact" },
};

/**
 * One row of the store details card.
 *
 * The original repeated this block three times in full, same wrapper, same
 * red tile, same label markup, with only the icon path and the value changing.
 */
function StoreDetail({
  label,
  icon,
  children,
}: {
  label: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-4">
      <div className="bg-brand flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl">
        <svg
          className="h-6 w-6 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
          aria-hidden="true"
        >
          {icon}
        </svg>
      </div>
      <div className="flex flex-col">
        <p className="mb-1 text-[11px] font-semibold tracking-wider whitespace-nowrap text-gray-400 uppercase">
          {label}
        </p>
        {children}
      </div>
    </div>
  );
}

/** Shared type styling for each detail's value. */
const VALUE_CLASS = "text-base font-bold text-white md:text-lg";

export default function ContactPage() {
  return (
    <div className="bg-admin">
      <JsonLd data={faqSchema(CONTACT_FAQS)} />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Contact", path: "/contact" },
        ])}
      />

      <div className="bg-admin py-14 md:py-20">
        <Container>
          <div className="mx-auto mb-10 max-w-3xl text-center md:mb-14">
            <p className="text-brand-text mb-3 text-[11px] font-semibold tracking-[0.28em] uppercase">
              Berkeley Vale NSW
            </p>
            <h1 className="text-3xl leading-tight font-extrabold tracking-tight text-balance text-white md:text-4xl">
              Contact Central Coast Auto Parts
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-gray-400 md:text-base">
              Call the yard, send an email, or come and see us. We answer the
              phone during trading hours and reply to email the same day.
            </p>
          </div>

          <div className="flex flex-col items-center gap-8 lg:flex-row lg:gap-12">
            <div className="w-full lg:w-1/2">
              <div className="border-line relative overflow-hidden rounded-2xl border">
                <Image
                  src="/images/contact image.png"
                  alt="The Central Coast Auto Parts yard at Berkeley Vale"
                  width={1200}
                  height={800}
                  className="h-auto w-full"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              </div>
            </div>

            <div className="w-full lg:w-1/2">
              <div className="border-line bg-card rounded-2xl border p-8 md:p-10">
                <h2 className="mb-8 text-xl font-extrabold tracking-tight text-white md:text-2xl">
                  Our Store
                </h2>

                <div className="space-y-6">
                  <StoreDetail
                    label="Address"
                    icon={
                      <>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </>
                    }
                  >
                    <p className={`${VALUE_CLASS} break-words`}>
                      {site.address.displayLine}
                    </p>
                  </StoreDetail>

                  <StoreDetail
                    label="Phone"
                    icon={
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    }
                  >
                    <a
                      href={`tel:${site.contact.phoneE164}`}
                      className={`${VALUE_CLASS} hover:text-brand-text break-words transition-colors`}
                    >
                      {site.contact.phone}
                    </a>
                  </StoreDetail>

                  <StoreDetail
                    label="Email"
                    icon={
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    }
                  >
                    <a
                      href={`mailto:${site.contact.email}`}
                      className={`${VALUE_CLASS} hover:text-brand-text break-all transition-colors md:whitespace-nowrap`}
                    >
                      {site.contact.email}
                    </a>
                  </StoreDetail>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </div>

      <ContactFormSection />

      <FaqSection
        faqs={CONTACT_FAQS}
        intro="Everything you need to know about our services"
      />
    </div>
  );
}

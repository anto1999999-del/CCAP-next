export type Faq = {
  question: string;
  answer: string;
};

/**
 * Home page FAQs.
 *
 * These are published as FAQPage structured data as well as rendered, so the
 * wording is a live SEO asset, Google may show these answers directly in
 * search results. Edit with that in mind, and keep the rendered text and the
 * structured data identical, which is why both read from this one list.
 */
export const HOMEPAGE_FAQS: readonly Faq[] = [
  {
    question:
      "Do used car parts from Central Coast Auto Parts come with a warranty?",
    answer:
      "Yes. All used car parts sold by Central Coast Auto Parts come with a warranty for your peace of mind. We stand behind the quality of every part we sell. Contact us on 02 4388 1818 for warranty details on specific parts.",
  },
  {
    question: "Where is Central Coast Auto Parts located?",
    answer:
      "Central Coast Auto Parts is located at 23 Hereford Street, Berkeley Vale NSW 2261, Australia. We are open Monday to Friday 8:00 AM to 5:00 PM and Saturday 9:00 AM to 2:00 PM.",
  },
  {
    question: "Do you deliver car parts Australia-wide?",
    answer:
      "Yes! Central Coast Auto Parts offers nationwide delivery across Australia. We dispatch parts quickly from our Berkeley Vale yard and can deliver to Sydney, Newcastle, Wollongong, and anywhere across NSW and Australia.",
  },
  {
    question: "What types of car parts does Central Coast Auto Parts stock?",
    answer:
      "We stock a wide range of quality used auto parts including engines, gearboxes, transmissions, body panels, doors, bonnets, suspension components, 4x4 parts, electrical components, and much more. We carry parts for all major makes and models.",
  },
  {
    question: "Can I sell my car to Central Coast Auto Parts?",
    answer:
      "Yes! We buy cars, vans, and light vehicles across NSW. Whether your car is old, damaged, or no longer running, we'll assess it and make you a fair offer. Visit our Sell Your Car page or call us on 02 4388 1818 to get started.",
  },
  {
    question: "What are the trading hours for Central Coast Auto Parts?",
    answer:
      "Our trading hours are Monday to Friday 8:00 AM to 5:00 PM and Saturday 9:00 AM to 2:00 PM. We are closed on Sundays. You can also contact us via WhatsApp on +61 405 888 488 outside business hours.",
  },
  {
    question: "Are used car parts cheaper than new OEM parts?",
    answer:
      "Yes, quality used car parts are typically 50-70% cheaper than brand new OEM parts, while still offering genuine manufacturer quality. At Central Coast Auto Parts, all our used parts are inspected and come with a warranty, giving you great value without compromising on quality.",
  },
  {
    question: "Do you stock Toyota, Kia and Hyundai parts?",
    answer:
      "Yes! We stock parts for all major makes including Toyota, Ford, Holden, Nissan, Mitsubishi, Mazda, Hyundai, Kia, Subaru, Volkswagen, and many more. Call us on 02 4388 1818 to check availability for your specific vehicle make and model.",
  },
] as const;

/**
 * Contact page FAQs, a different, shorter set aimed at someone about to get in
 * touch, rather than the broader questions on the home page.
 */
export const CONTACT_FAQS: readonly Faq[] = [
  {
    question: "Do you sell new or used parts?",
    answer:
      "We specialize in used and recycled car parts from 4x4s, vans, hybrids, and light vehicles. All parts are tested for quality before sale.",
  },
  {
    question: "Can I order parts online?",
    answer:
      "Yes, we ship across NSW and Australia. You can also pick up directly from our Berkeley Vale yard.",
  },
  {
    question: "Do you buy unwanted cars?",
    answer:
      "Yes, we buy old, damaged, and scrap cars. Use our contact form or call us for a free quote.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept cash, EFTPOS, bank transfer, and secure online payments.",
  },
  {
    question: "Do your parts come with a warranty?",
    answer:
      "Yes, many parts come with a limited warranty. Details depend on the item, please ask our team before purchase.",
  },
  {
    question: "How do I request a part?",
    answer:
      "Simply use our Request a Quote form or call us on 02 4388 1818 with your vehicle make, model, and year.",
  },
] as const;

/** FAQPage structured data for a set of questions. */
export function faqSchema(faqs: readonly Faq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

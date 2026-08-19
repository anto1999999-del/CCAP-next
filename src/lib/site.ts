/**
 * Single source of truth for business details and canonical URLs.
 *
 * These values appear in page metadata, structured data, the footer and the
 * contact page. In the old codebase the phone number, address and opening hours
 * were retyped in each of those places, which is how the Birdeye and Wheree
 * listings ended up disagreeing with the site. Change them here only.
 */
export const site = {
  name: "Central Coast Auto Parts",
  /** No trailing slash — everything else appends its own. */
  url: "https://centralcoastautoparts.com.au",
  description:
    "Quality used car parts in Berkeley Vale, NSW. Engines, gearboxes, body panels and more — all with warranty. Nationwide delivery. Call 02 4388 1818.",
  logo: "/aa.png",

  contact: {
    /** Display form, as shown to customers. */
    phone: "02 4388 1818",
    /** E.164, for tel: links and structured data. */
    phoneE164: "+61243881818",
    salesMobileE164: "+61405888488",
    email: "sales@centralcoastautoparts.com.au",
    licence: "MD097479",
  },

  address: {
    street: "23 Hereford Street",
    suburb: "Berkeley Vale",
    state: "NSW",
    postcode: "2261",
    country: "AU",
    /**
     * How the address is written in the footer. Held separately from the parts
     * above because structured data wants the full "Street" while the footer
     * has always abbreviated it, and reassembling one from the other in the
     * view means string surgery every time it is rendered.
     */
    displayLine: "23 Hereford ST, Berkeley Vale NSW 2261",
  },

  hours: {
    /** Structured-data form, 24-hour. */
    opens: "08:00",
    closes: "17:00",
    /** Exactly as the footer prints it. */
    displayLine: "MON-FRI 8:00 AM - 5:00 PM AND SAT 9:00 AM TO 2:00 PM",
  },

  /**
   * Official profiles, published as `sameAs` in the Organization schema.
   *
   * Confirmed with the owner 2026-08-19, resolving a disagreement between what
   * the footer linked to and what the structured data claimed:
   *
   * - Both Facebook URLs are real and both belong to the business — one is the
   *   Page, the other the Marketplace profile. `sameAs` takes a list, so both
   *   are listed rather than one being dropped.
   * - eBay: /usr/central_coast_auto_parts permanently redirects to the /str/
   *   address, so the /str/ form is the canonical one and is used everywhere.
   * - Gumtree: the /web/s-user/ address is the live seller profile. The
   *   /s-seller/ URL previously in the structured data is not.
   */
  social: [
    "https://www.facebook.com/profile.php?id=61556394574657",
    "https://www.facebook.com/marketplace/profile/61555589287454/",
    "https://www.instagram.com/centralcoastautoparts",
    "https://www.gumtree.com.au/web/s-user/1499623032693",
    "https://www.ebay.com.au/str/centralcoastautopartsaus",
  ],

  analytics: {
    ga4: "G-LGWF4V6LSY",
    clarity: "szs61etqwy",
    podiumToken: "86e3ba97-0076-4fbc-95ba-3fcb19444b58",
  },
} as const;

/** Absolute URL for a site-relative path. Metadata and JSON-LD need absolutes. */
export function absoluteUrl(path = "/"): string {
  return new URL(path, site.url).toString();
}

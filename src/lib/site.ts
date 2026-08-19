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
  },

  hours: {
    weekdays: "Mon–Fri 8:00am – 5:00pm",
    saturday: "Sat 9:00am – 2:00pm",
  },

  social: [
    "https://www.facebook.com/profile.php?id=61556394574657",
    "https://www.instagram.com/centralcoastautoparts",
    "https://www.gumtree.com.au/s-seller/Central%20Coast%20Auto%20Parts/1029451812",
    "https://www.ebay.com.au/usr/central_coast_auto_parts",
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

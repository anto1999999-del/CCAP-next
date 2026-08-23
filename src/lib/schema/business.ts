import { site } from "@/lib/site";

/**
 * LocalBusiness + WebSite structured data for the home page.
 *
 * Carried across unchanged from the current site. The figures in
 * `aggregateRating` describe real published reviews, do not invent, round or
 * "refresh" them, and update them only from the actual review count. Fabricated
 * ratings are a manual-action risk in Search Console.
 */
export function homeBusinessSchema() {
  const { address, contact, hours } = site;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["AutoPartsStore", "AutoWrecked", "LocalBusiness"],
        "@id": `${site.url}/#business`,
        name: site.name,
        alternateName: "CCAP",
        description:
          "Quality used car parts in Berkeley Vale, NSW. Engines, gearboxes, body panels and more, all with warranty. Auto wreckers serving the Central Coast, Sydney and all of NSW with nationwide delivery.",
        url: `${site.url}/`,
        logo: {
          "@type": "ImageObject",
          url: `${site.url}${site.logo}`,
          width: 600,
          height: 200,
        },
        image: `${site.url}${site.logo}`,
        telephone: contact.phoneE164,
        email: contact.email,
        address: {
          "@type": "PostalAddress",
          streetAddress: address.street,
          addressLocality: address.suburb,
          addressRegion: address.state,
          postalCode: address.postcode,
          addressCountry: address.country,
        },
        geo: {
          "@type": "GeoCoordinates",
          latitude: -33.3238671,
          longitude: 151.4242598,
        },
        openingHoursSpecification: [
          {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
            opens: hours.opens,
            closes: hours.closes,
          },
          {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: "Saturday",
            opens: "09:00",
            closes: "14:00",
          },
        ],
        priceRange: "$$",
        currenciesAccepted: "AUD",
        paymentAccepted:
          "Cash, Credit Card, Visa, Mastercard, American Express, PayPal",
        areaServed: [
          { "@type": "State", name: "New South Wales" },
          { "@type": "City", name: "Berkeley Vale" },
          { "@type": "City", name: "Gosford" },
          { "@type": "City", name: "Wyong" },
          { "@type": "City", name: "Tuggerah" },
          { "@type": "City", name: "Sydney" },
          { "@type": "City", name: "Newcastle" },
        ],
        hasOfferCatalog: {
          "@type": "OfferCatalog",
          name: "Used Auto Parts Catalog",
          itemListElement: [
            "Used Engines",
            "Gearboxes & Transmissions",
            "Body Panels",
            "4x4 Parts",
            "Suspension Components",
            "Electrical Parts",
          ].map((name) => ({
            "@type": "Offer",
            itemOffered: { "@type": "Product", name },
          })),
        },
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: "5.0",
          reviewCount: "103",
          bestRating: "5",
          worstRating: "1",
        },
        sameAs: site.social,
        keywords:
          "used car parts central coast, auto wreckers NSW, car parts Berkeley Vale, wreckers central coast, used engines NSW, second hand car parts Australia",
      },
      {
        "@type": "WebSite",
        "@id": `${site.url}/#website`,
        url: `${site.url}/`,
        name: site.name,
        description:
          "Quality used car parts with warranty. Auto wreckers Berkeley Vale NSW.",
        publisher: { "@id": `${site.url}/#business` },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${site.url}/?s={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
        inLanguage: "en-AU",
      },
    ],
  };
}

import { site } from "@/lib/site";

/**
 * Service structured data for the "sell your car" page.
 *
 * Carried across unchanged from the current site. It describes the vehicle
 * buying service and the area it covers, which is what lets the page surface
 * for "sell my car" style searches rather than only for parts.
 */
export function sellYourCarServiceSchema() {
  const { address, contact } = site;

  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Sell Your Car | Central Coast Auto Parts",
    description:
      "Sell your used, damaged or unwanted car, van or light vehicle to Central Coast Auto Parts in Berkeley Vale NSW. We buy all makes and models across NSW and offer fast assessment and fair prices.",
    url: `${site.url}/sellyourcar`,
    provider: {
      /*
        Not "AutoWrecked", which this said and which is not a schema.org type
        at all. The automotive branch has AutoBodyShop, AutoDealer,
        AutoPartsStore, AutoRental, AutoRepair, AutoWash, GasStation and the
        two motorcycle ones, and nothing else.
      */
      "@type": "AutoPartsStore",
      name: site.name,
      url: `${site.url}/`,
      telephone: contact.phoneE164,
      address: {
        "@type": "PostalAddress",
        streetAddress: address.street,
        addressLocality: address.suburb,
        addressRegion: address.state,
        postalCode: address.postcode,
        addressCountry: address.country,
      },
    },
    serviceType: "Car Buying / Vehicle Purchasing",
    areaServed: { "@type": "State", name: "New South Wales" },
    offers: {
      "@type": "Offer",
      description:
        "Fair cash offer for your used or unwanted vehicle. All makes and models accepted.",
      priceCurrency: "AUD",
      availability: "https://schema.org/InStock",
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Vehicles We Buy",
      itemListElement: [
        "Buy Used Cars NSW",
        "Buy Damaged Cars NSW",
        "Buy Vans and Light Vehicles",
        "Buy 4WD and SUV Vehicles",
      ].map((name) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name },
      })),
    },
  };
}

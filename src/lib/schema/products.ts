import { site } from "../site";

/**
 * The structured data on /products.
 *
 * Carried across from the current site unchanged apart from punctuation. It
 * describes the six ranges the yard sells rather than the parts on the page,
 * which is deliberate: the page shows twenty of thirty thousand rows, and those
 * twenty are different every time the catalogue syncs, so listing them would
 * describe stock that has moved by the time anyone looked.
 */

type Range = { name: string; description: string };

const RANGES: Range[] = [
  {
    name: "Used Engines, All Makes & Models",
    description:
      "Quality used petrol and diesel engines for all major car brands. Tested and warranty-backed. Available for pickup in Berkeley Vale or nationwide delivery.",
  },
  {
    name: "Used Gearboxes & Transmissions",
    description:
      "Automatic and manual gearboxes for all vehicle makes. Inspected, tested and warranty-backed. Nationwide delivery available.",
  },
  {
    name: "Body Panels, Doors, Bonnets, Guards",
    description:
      "Used body panels including doors, bonnets, guards, bumpers and more. Available in various colours and conditions.",
  },
  {
    name: "4x4 & 4WD Parts Central Coast",
    description:
      "Specialist 4x4 and 4WD parts for Hilux, Landcruiser, Patrol, Pajero, Ranger and more. Extensive stock at Berkeley Vale.",
  },
  {
    name: "Suspension & Steering Components",
    description:
      "Used suspension arms, steering racks, struts, shock absorbers and more. All parts inspected before sale.",
  },
  {
    name: "Electrical Parts & Accessories",
    description:
      "Alternators, starters, ECUs, headlights, taillights and electrical components for all makes and models.",
  },
];

export const productsListSchema = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: `Used Car Parts, ${site.name}`,
  description:
    "Browse our range of quality used auto parts for all makes and models. All parts come with warranty.",
  url: `${site.url}/products`,
  numberOfItems: RANGES.length,
  itemListElement: RANGES.map((range, index) => ({
    "@type": "ListItem",
    position: index + 1,
    item: {
      "@type": "Product",
      name: range.name,
      description: range.description,
      brand: { "@type": "Brand", name: site.name },
      offers: {
        "@type": "Offer",
        priceCurrency: "AUD",
        availability: "https://schema.org/InStock",
        seller: { "@id": `${site.url}/#organization` },
      },
    },
  })),
};

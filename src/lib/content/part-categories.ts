/**
 * The seven part-category landing pages.
 *
 * Carried across from the current site word for word. These are the pages that
 * rank for "used engines for sale NSW" and the like, so the copy, the headings
 * and the meta descriptions are an SEO asset, not a draft: they are not to be
 * reworded without the owner agreeing to it. The only change made in the move
 * was the punctuation, to the site-wide rule about dashes.
 *
 * They exist because the catalogue cannot rank for these searches. A page of
 * twenty rows out of thirty thousand, different after every sync, is not what
 * somebody typing "used gearbox NSW" is looking for; this is.
 */

export type PartCategoryFaq = { question: string; answer: string };

export type PartCategory = {
  slug: string;
  /** Shown on the hub card and in the "other categories" row. */
  label: string;
  icon: string;
  title: string;
  description: string;
  h1: string;
  /** Small caps line above the heading. */
  tagline: string;
  intro: string;
  body: string;
  /** What the yard stocks in this category, as a list of chips. */
  items: string[];
  makes: string;
  faq: PartCategoryFaq[];
  /**
   * The catalogue part type this category maps to, where one exists, so the
   * page can link into real stock rather than only to the whole catalogue.
   */
  partType?: string;
};

const LISTING: { slug: string; label: string; icon: string }[] = [
  { slug: "engines", label: "Engines", icon: "🚗" },
  { slug: "gearboxes", label: "Gearboxes & Transmissions", icon: "⚙️" },
  { slug: "body-panels", label: "Body Panels & Doors", icon: "🧩" },
  { slug: "electrical", label: "Electrical Components", icon: "🔌" },
  { slug: "suspension", label: "Suspension & Steering", icon: "🔩" },
  { slug: "cooling", label: "Cooling System Parts", icon: "💧" },
  { slug: "interior", label: "Interior Parts", icon: "🪑" },
];

const COPY: Record<string, Omit<PartCategory, "slug" | "label" | "icon">> = {
  engines: {
    title: "Used Engines for Sale NSW | Central Coast Auto Parts",
    description:
      "Quality second-hand engines for sale in NSW. Low-km used engines for cars, 4x4s, vans, inspected, warranted and shipped Australia-wide from Berkeley Vale.",
    h1: "Used Engines for Sale, Central Coast NSW",
    tagline: "ENGINES, BERKELEY VALE NSW",
    intro:
      "Central Coast Auto Parts stocks a wide range of second-hand engines removed from carefully dismantled vehicles. Every engine is checked by our team before sale and major units are sold with warranty. We supply mechanics, smash repairers and everyday customers across the Central Coast, Sydney and all of Australia.",
    body:
      "Whether you need a petrol or diesel engine for a passenger car, 4WD, van or light commercial, we carry stock across the most common Japanese, Korean, European and Australian makes. All engines are sourced from low-kilometre vehicles where possible and inspected for obvious faults before dispatch.",
    items: [
      "Petrol Engines",
      "Diesel Engines",
      "4-Cylinder Engines",
      "V6 Engines",
      "V8 Engines",
      "Turbocharged Engines",
      "4WD & SUV Engines",
      "Van & Light Commercial Engines",
    ],
    makes: "Toyota, Nissan, Mazda, Ford, Holden, Mitsubishi, Subaru, Honda, Hyundai, Kia and more.",
    faq: [
      {
        question: "Do used engines come with a warranty?",
        answer: "Yes, major used engines sold by Central Coast Auto Parts are supplied with warranty. Warranty terms vary by unit; ask our team before purchase.",
      },
      {
        question: "How do I know if the engine will fit my car?",
        answer: "Provide us with your vehicle year, make, model and engine code and we'll confirm compatibility before dispatch.",
      },
      {
        question: "Do you ship engines Australia-wide?",
        answer: "Yes. We freight engines to Sydney, Newcastle, Brisbane, Melbourne and everywhere in between. Contact us for a freight quote.",
      },
    ],
  },
  gearboxes: {
    title: "Used Gearboxes for Sale NSW | Central Coast Auto Parts",
    description:
      "Second-hand manual and automatic gearboxes for sale NSW. Used transmissions for cars, 4x4s and vans, inspected and warranted, shipped Australia-wide.",
    h1: "Used Gearboxes & Transmissions, Central Coast NSW",
    tagline: "GEARBOXES & TRANSMISSIONS, BERKELEY VALE NSW",
    intro:
      "Central Coast Auto Parts stocks used manual and automatic gearboxes for a wide range of makes and models. All units are sourced from dismantled vehicles, inspected by our team, and major gearboxes are sold with warranty.",
    body:
      "A replacement gearbox from a reputable wrecker can save you hundreds over a reconditioned or new unit. We carry transmissions for passenger cars, 4WDs, vans and light commercials, including transfer cases, differentials and driveshafts for four-wheel-drive vehicles.",
    items: [
      "Manual Gearboxes",
      "Automatic Transmissions",
      "CVT Transmissions",
      "Transfer Cases",
      "Differentials",
      "Driveshafts",
      "4WD Gearboxes",
      "Van & Commercial Transmissions",
    ],
    makes: "Toyota, Nissan, Mazda, Ford, Holden, Mitsubishi, Subaru, Honda, Hyundai, Kia and more.",
    faq: [
      {
        question: "Do used gearboxes come with a warranty?",
        answer: "Yes, major used gearboxes and transmissions are sold with warranty. Ask our team for specific warranty terms on any unit.",
      },
      {
        question: "Can I get a gearbox for my 4WD?",
        answer: "Yes. We stock gearboxes and transfer cases for popular 4WD models including LandCruiser, Patrol, Hilux, Triton and more.",
      },
      {
        question: "Do you ship gearboxes interstate?",
        answer: "Yes. We freight gearboxes Australia-wide. Contact us with your location for a freight quote.",
      },
    ],
  },
  "body-panels": {
    title: "Used Body Panels for Sale NSW | Central Coast Auto Parts",
    description:
      "Second-hand doors, bonnets, guards and bumpers for sale NSW. Quality used body panels at a fraction of dealer cost, shipped Australia-wide.",
    h1: "Used Body Panels & Doors, Central Coast NSW",
    tagline: "BODY PANELS & DOORS, BERKELEY VALE NSW",
    intro:
      "Central Coast Auto Parts supplies second-hand body panels at a fraction of new dealer prices. Whether you need a replacement door, bonnet, bumper bar or guard after an accident, our dismantling yard carries a regularly updated stock of exterior parts across hundreds of makes and models.",
    body:
      "All body panels are removed from our dismantled vehicles by our team and checked for panel condition before sale. Colour codes are provided where available. Parts are suitable for smash repairers, panel beaters, insurers and private customers.",
    items: [
      "Front & Rear Doors",
      "Bonnets",
      "Tailgates & Boot Lids",
      "Front & Rear Bumper Bars",
      "Guards & Mudguards",
      "Rocker Panels & Sills",
      "Roof Panels",
      "Mirrors",
    ],
    makes: "Toyota, Nissan, Mazda, Ford, Holden, Mitsubishi, Subaru, Honda, Hyundai, Kia and more.",
    faq: [
      {
        question: "Can I get a colour-matched panel?",
        answer: "We provide paint/colour codes where available so you can match the panel to your vehicle's colour. Some panels can be supplied painted; ask our team.",
      },
      {
        question: "Do you supply panels for smash repairers?",
        answer: "Yes, we supply smash repairers, panel shops and insurance companies with used body panels at competitive trade prices.",
      },
      {
        question: "How quickly can I get a panel?",
        answer: "Most panels in stock can be dispatched same day or next business day. Contact us with your vehicle details for availability.",
      },
    ],
  },
  electrical: {
    title: "Used Electrical Parts NSW | Central Coast Auto Parts",
    description:
      "Second-hand ECUs, headlights, alternators and starter motors for sale NSW. Quality used auto electrical parts, tested before dispatch.",
    h1: "Used Auto Electrical Parts, Central Coast NSW",
    tagline: "AUTO ELECTRICAL PARTS, BERKELEY VALE NSW",
    intro:
      "Central Coast Auto Parts stocks a broad range of second-hand auto electrical components removed from dismantled vehicles. All electrical parts are checked before sale and dispatched to customers across Australia.",
    body:
      "New auto electrical parts can be extremely expensive. A tested, second-hand unit from a reputable wrecker is often the most cost-effective solution for your repair. We carry ECUs, body control modules, lighting, starting and charging components, and other auto electrical parts.",
    items: [
      "ECUs & Body Control Modules",
      "Headlights & Taillights",
      "Alternators & Starter Motors",
      "Ignition Systems",
      "Switches & Controls",
      "Instrument Clusters",
      "Wiring Looms",
      "Sensors & Actuators",
    ],
    makes: "Toyota, Nissan, Mazda, Ford, Holden, Mitsubishi, Subaru, Honda, Hyundai, Kia and more.",
    faq: [
      {
        question: "Are used ECUs compatible with my car?",
        answer: "ECU compatibility depends on the exact vehicle model, year and VIN. Our team will confirm compatibility before dispatch. Some ECUs may require coding, we can advise.",
      },
      {
        question: "Are electrical parts tested before sale?",
        answer: "Yes. Electrical components are checked by our team before dispatch. If a part arrives faulty, contact us promptly.",
      },
      {
        question: "Do you ship electrical parts Australia-wide?",
        answer: "Yes. Smaller electrical parts are typically dispatched via express freight and arrive within 1-5 business days depending on location.",
      },
    ],
  },
  suspension: {
    title: "Used Suspension & Steering NSW | Central Coast Auto Parts",
    description:
      "Second-hand suspension, steering and drivetrain parts for sale NSW. Struts, control arms, tie rods and CV joints, shipped Australia-wide.",
    h1: "Used Suspension & Steering Parts, Central Coast NSW",
    tagline: "SUSPENSION & STEERING, BERKELEY VALE NSW",
    intro:
      "Central Coast Auto Parts supplies used suspension and steering components removed from carefully dismantled vehicles. We carry parts for passenger cars, 4WDs, vans and light commercials across a wide range of makes and models.",
    body:
      "Suspension and steering parts wear over time but replacing them with quality second-hand units is a cost-effective alternative to new parts. All components are visually inspected before sale and dispatched to mechanics, workshops and private customers Australia-wide.",
    items: [
      "Struts & Shock Absorbers",
      "Control Arms & Ball Joints",
      "Tie Rods & Rack & Pinion",
      "Steering Columns & Pumps",
      "CV Joints & Axles",
      "Sway Bars & Links",
      "Wheel Hubs & Bearings",
      "4WD Suspension Components",
    ],
    makes: "Toyota, Nissan, Mazda, Ford, Holden, Mitsubishi, Subaru, Honda, Hyundai, Kia and more.",
    faq: [
      {
        question: "Are used suspension parts safe?",
        answer: "All suspension parts are visually inspected before sale. We recommend having a qualified mechanic assess and install any second-hand suspension component.",
      },
      {
        question: "Can I get suspension parts for a 4WD?",
        answer: "Yes. We regularly carry suspension components for popular 4WD and SUV models. Contact us with your vehicle details.",
      },
      {
        question: "Do you ship suspension parts interstate?",
        answer: "Yes, we ship Australia-wide. Freight cost depends on item weight and your location. Contact us for a quote.",
      },
    ],
  },
  cooling: {
    title: "Used Cooling System Parts NSW | Central Coast Auto Parts",
    description:
      "Second-hand radiators, intercoolers and cooling fans for sale NSW. Quality used cooling components, tested and shipped Australia-wide.",
    h1: "Used Cooling System Parts, Central Coast NSW",
    tagline: "COOLING SYSTEM PARTS, BERKELEY VALE NSW",
    intro:
      "Central Coast Auto Parts stocks a range of second-hand cooling system components for passenger cars, 4WDs and light commercials. All parts are removed from our dismantled vehicles and checked before sale.",
    body:
      "Cooling system failures can cause serious engine damage if left untreated. A quality second-hand radiator, intercooler or coolant fan from a trusted wrecker is often a fast and affordable fix. We carry cooling components for a wide range of makes and models.",
    items: [
      "Radiators",
      "Intercoolers",
      "Coolant Fans & Shrouds",
      "Water Pumps",
      "Thermostats & Housings",
      "Oil Coolers",
      "Air Conditioning Condensers",
      "Overflow Tanks & Reservoirs",
    ],
    makes: "Toyota, Nissan, Mazda, Ford, Holden, Mitsubishi, Subaru, Honda, Hyundai, Kia and more.",
    faq: [
      {
        question: "Are used radiators reliable?",
        answer: "Yes, we check radiators for obvious leaks and damage before sale. Second-hand radiators from low-kilometre vehicles are a cost-effective solution.",
      },
      {
        question: "Do you stock intercoolers for diesel 4WDs?",
        answer: "Yes. We regularly carry intercoolers for popular turbocharged diesel vehicles. Contact us with your vehicle details.",
      },
      {
        question: "Can you ship a radiator interstate?",
        answer: "Yes. Radiators and cooling parts are freight-packed and shipped Australia-wide. Contact us for a freight quote.",
      },
    ],
  },
  interior: {
    title: "Used Interior Parts for Sale NSW | Central Coast Auto Parts",
    description:
      "Second-hand seats, dashboards, door trims and carpet for sale NSW. Quality used car interior parts, shipped Australia-wide from Berkeley Vale.",
    h1: "Used Interior Parts, Central Coast NSW",
    tagline: "INTERIOR PARTS, BERKELEY VALE NSW",
    intro:
      "Central Coast Auto Parts stocks a wide range of second-hand interior components removed from dismantled vehicles. From seats and dashboards to door trims and steering wheels, we carry interior parts for cars, 4WDs and vans across many makes and models.",
    body:
      "Replacing interior parts with quality used components is a cost-effective way to restore your vehicle's cabin without the expense of new dealer parts. Our yard is regularly updated as new vehicles are dismantled, so stock changes frequently.",
    items: [
      "Front & Rear Seats",
      "Dashboards & Instrument Panels",
      "Door Trims & Cards",
      "Centre Consoles",
      "Steering Wheels & Columns",
      "Carpet & Floor Liners",
      "Sun Visors & Roof Liners",
      "Window Regulators & Motors",
    ],
    makes: "Toyota, Nissan, Mazda, Ford, Holden, Mitsubishi, Subaru, Honda, Hyundai, Kia and more.",
    faq: [
      {
        question: "Do interior parts come in matching colours?",
        answer: "We note interior colour where possible. Contact us with your vehicle's interior colour code for the best match.",
      },
      {
        question: "Can I get seats for my 4WD?",
        answer: "Yes. We regularly carry front and rear seat sets for popular 4WD and SUV models. Contact us with your vehicle details.",
      },
      {
        question: "Do you ship interior parts interstate?",
        answer: "Yes, most interior parts can be freight-packed and shipped Australia-wide. Contact us for a quote.",
      },
    ],
  },
};

/**
 * Part types these categories map to in the catalogue.
 *
 * Only the two the supplier codes cleanly. The rest span many codes (a body
 * panel is a door, a bonnet, a guard, a tailgate), so linking them to a single
 * part-type filter would show a fraction of the stock and imply that was all of
 * it. Those pages link to the whole catalogue instead.
 */
const PART_TYPES: Record<string, string> = {
  engines: "ENGINE",
  // Not GEARBOX. The catalogue files every one of them under TRANS_GEARBOX.
  gearboxes: "TRANS_GEARBOX",
};

export const PART_CATEGORIES: PartCategory[] = LISTING.map((entry) => ({
  ...entry,
  ...COPY[entry.slug],
  partType: PART_TYPES[entry.slug],
}));

export function findPartCategory(slug: string): PartCategory | null {
  return PART_CATEGORIES.find((category) => category.slug === slug) ?? null;
}

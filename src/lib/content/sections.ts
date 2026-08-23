/**
 * Copy for the marketing sections shared by Home and About.
 *
 * These three sections were duplicated in full across both pages in the site
 * this replaces, same markup, same wording, maintained twice. They had already
 * started to drift apart (see SUPPLY_CARDS below), which is what duplication
 * always does eventually.
 */

export type SupplyCard = {
  icon: string;
  title: string;
  /** Set when the card should link to its category page. */
  slug: string | null;
  desc: string;
};

export const SUPPLY_CARDS: readonly SupplyCard[] = [
  {
    icon: "🚗",
    title: "Used Engines",
    slug: "engines",
    desc: "Low-kilometre second-hand engines sourced from dismantled vehicles, inspected by our team and supplied with warranty across Australia.",
  },
  {
    icon: "⚙️",
    title: "Gearboxes & Driveline",
    slug: "gearboxes",
    desc: "Used manual and automatic gearboxes, differentials and driveline components available for a wide range of makes and models.",
  },
  {
    icon: "🧩",
    title: "Panels & Body Parts",
    slug: "body-panels",
    desc: "Second-hand bumpers, guards, bonnets, doors, tailgates and exterior body parts at affordable prices, a fraction of dealer costs.",
  },
  {
    icon: "🔌",
    title: "Electrical Components",
    slug: "electrical",
    desc: "Used ECUs, modules, switches, headlights, alternators, starter motors and other auto electrical parts checked before dispatch.",
  },
  {
    icon: "🧰",
    title: "Suspension & Steering",
    slug: "suspension",
    desc: "Suspension, steering, cooling systems, A/C and other mechanical parts removed from dismantled vehicles and ready to fit.",
  },
  {
    icon: "🚚",
    title: "Australia-Wide Delivery",
    slug: null,
    desc: "We ship used auto parts to Sydney, Newcastle, Brisbane, Melbourne and everywhere in between, with fast freight, secure packaging.",
  },
  {
    icon: "🏷️",
    title: "Trade & Workshop Supply",
    slug: null,
    desc: "Supplying smash repairers, mechanics, insurers and fleet operators with reliable used car parts at competitive trade prices.",
  },
  {
    icon: "🔧",
    title: "Supply & Fit Available",
    slug: null,
    desc: "Selected major components can be supplied and fitted through our workshop. Ask our team about availability for your vehicle.",
  },
] as const;

/**
 * About's version of the fifth card, which the old site titled "Mechanical
 * Components" while Home called the same card, with identical wording,
 * "Suspension & Steering".
 *
 * Preserved rather than unified so no page loses a phrase it currently ranks
 * for. Flagged in docs/DESIGN-NOTES.md, one name should win, and then this
 * override should go.
 */
export const ABOUT_SUPPLY_CARDS: readonly SupplyCard[] = SUPPLY_CARDS.map(
  (card) =>
    card.slug === "suspension"
      ? { ...card, title: "Mechanical Components" }
      : card,
);

export const USED_PART_BENEFITS = [
  {
    icon: "✓",
    title: "Save Up to 70% vs New",
    desc: "Quality used car parts cost a fraction of new dealer prices, without sacrificing reliability when sourced from a reputable wrecker.",
  },
  {
    icon: "💰",
    title: "Sell Your Unwanted Vehicle",
    desc: "We buy damaged, non-running and end-of-life vehicles across the Central Coast and Sydney. Get a fast cash quote today.",
  },
  {
    icon: "🔧",
    title: "Faster Turnaround",
    desc: "In-stock used parts mean quicker repairs, with no waiting weeks for back-ordered new parts. Get your car back on the road sooner.",
  },
] as const;

export const REASONS_TO_CHOOSE = [
  {
    icon: "🚚",
    title: "Fast Dispatch & Freight Nationwide",
    desc: "Quick part checks, same-day dispatch where possible, and freight options to anywhere in Australia.",
  },
  {
    icon: "📦",
    title: "Large Stock of Used Auto Parts",
    desc: "Engines, gearboxes, body panels, electrical and mechanical parts across hundreds of makes and models, all in stock.",
  },
  {
    icon: "♻️",
    title: "Reputable Car Wreckers NSW",
    desc: "A real dismantling yard with hands-on knowledge, genuine quality checks and honest advice on every part’s condition.",
  },
  {
    icon: "🛡️",
    title: "Warranty on Major Components",
    desc: "All major used parts, including engines and gearboxes, are sold with warranty for added peace of mind.",
  },
] as const;

/** Where the business ships to, listed on About. */
export const SERVICE_AREAS = [
  { area: "Berkeley Vale", note: "Our yard" },
  { area: "Gosford", note: "Central Coast" },
  { area: "Tuggerah", note: "Central Coast" },
  { area: "Wyong", note: "Central Coast" },
  { area: "Newcastle", note: "Hunter Region" },
  { area: "Sydney", note: "Metro & surrounds" },
  { area: "Wollongong", note: "South Coast" },
  { area: "Canberra", note: "ACT" },
  { area: "Brisbane", note: "QLD" },
  { area: "Melbourne", note: "VIC" },
  { area: "Adelaide", note: "SA" },
  { area: "Australia-Wide", note: "Express freight" },
] as const;

export type TermsSection = {
  title: string;
  /** Lead paragraph, rendered slightly brighter than the body. */
  intro?: string;
  body?: string;
  clauses?: readonly string[];
  bulletsIntro?: string;
  bullets?: readonly string[];
  footer?: string;
};

/**
 * Terms and warranty conditions.
 *
 * This is a legal document. Do not reword, summarise or "tidy" any of it.
 * These clauses set the warranty period, the liability caps and the returns
 * window, and the business relies on them. Changes come from the owner only.
 */
export const TERMS_SECTIONS: readonly TermsSection[] = [
  {
    title: "Warranty Overview",
    intro:
      "All parts supplied by Central Coast Auto Parts include a standard 3-month parts-only warranty commencing from the invoice date. Optional labour warranty is available on most parts upon request, and extended warranty options may be available on selected items.",
    body: "This warranty is provided in addition to the rights and remedies available to consumers under the Australian Consumer Law. Nothing in these terms excludes or limits those rights except where permitted by law. All parts are supplied subject to stock availability and the terms outlined below. These terms are intended to limit liability to the maximum extent permitted by law.",
    clauses: [
      "Warranty applies to the original purchaser only and is non-transferable.",
    ],
  },
  {
    title: "Costs and Losses",
    body: "Central Coast Auto Parts is not responsible for any labour, freight, towing costs, loss of income, vehicle downtime, or any consequential loss or damage arising from the use or failure of supplied parts.",
  },
  {
    title: "Reporting Issues",
    body: "If a fault is identified, the customer must immediately cease using the part and notify Central Coast Auto Parts. Continued use after a fault is identified will void warranty.",
  },
  {
    title: "Returned Parts",
    body: "All parts returned for warranty or any other reason must be in original condition. Parts must not be painted, altered, dismantled, or tampered with.",
  },
  {
    title: "Warranty Claims",
    clauses: [
      "All warranty claims are subject to assessment. Central Coast Auto Parts reserves the right to repair, replace, or refund the original purchase price of the part at its discretion.",
    ],
    bulletsIntro: "All claims must be supported by:",
    bullets: [
      "Proof of purchase (invoice)",
      "Installation invoice",
      "Written diagnostic report from a qualified mechanic",
      "Photos or video evidence where required",
    ],
    footer:
      "Central Coast Auto Parts reserves the right to reject any claim that does not meet these requirements.",
  },
  {
    title: "Labour Warranty",
    clauses: [
      "Where labour warranty has been purchased, labour claims are capped at $100 (including GST) per claim.",
      "No repairs are to be carried out without prior written approval from Central Coast Auto Parts. Any unauthorised repairs will be at the customer’s expense.",
    ],
  },
  {
    title: "Engine Warranty",
    body: "Engines supplied must retain all heat tabs. Any tampering, removal, or evidence of overheating will void warranty.",
  },
  {
    title: "Servicing Requirements",
    body: "All parts must be installed by a qualified or licensed technician and serviced in accordance with manufacturer guidelines. Failure to do so will void warranty.",
  },
  {
    title: "Seals and Leaks",
    body: "All engine and driveline seals must be replaced prior to installation. Oil leaks and fluid leaks are not covered under warranty.",
  },
  {
    title: "Transmission Programming",
    body: "Central Coast Auto Parts is not responsible for transmission programming or calibration. New transmission service kits and fluids must be fitted at installation.",
  },
  {
    title: "Warranty Exclusions",
    body: "Warranty does not apply to accessories or ancillary components supplied with parts. This includes, but is not limited to, turbochargers, sensors, wiring, switches, electronics, belts, hoses, water pumps, oil seals, and manifolds. These items are supplied for convenience only and are not covered under warranty.",
  },
  {
    title: "Damage Exclusions",
    clauses: [
      "Warranty does not apply to parts damaged due to accident, misuse, neglect, improper installation, inconsistent use, or external factors.",
      "Failure caused by pre-existing or worn components (including but not limited to cooling systems, oil systems, EGR components, and related systems) is not covered under warranty.",
    ],
  },
  {
    title: "Consequential Loss",
    body: "Central Coast Auto Parts is not responsible for any consequential loss or damage, including loss of income or vehicle downtime resulting from part failure.",
  },
  {
    title: "Returns Policy",
    clauses: [
      "Incorrect or unwanted goods must be returned within 14 days from the invoice date. All returned items must be in original condition.",
      "A restocking fee of up to 25% may apply to returned goods. Freight costs and any associated charges are the responsibility of the customer.",
    ],
  },
  {
    title: "Limit of Liability",
    body: "Central Coast Auto Parts’ liability is limited to the original purchase price of the goods supplied, with a maximum liability of $2,500 per invoiced part.",
  },
  {
    title: "Warranty Period",
    body: "Warranty commences from the invoice date. Replacement parts do not extend or restart the original warranty period.",
  },
  {
    title: "Ownership of Goods",
    body: "All goods remain the property of Central Coast Auto Parts until full payment has been received.",
  },
  {
    title: "Refunds",
    body: "Refunds on the day of purchase may be issued in cash. All other refunds will be processed via bank transfer.",
  },
  {
    title: "Verification Process",
    body: "Customers are required to provide a valid VIN or registration number at the time of ordering to ensure correct part supply. Failure to provide correct details may result in additional charges or reduced eligibility for refunds.",
  },
  {
    title: "Return of Incorrect Goods",
    body: "Goods supplied incorrectly must be returned within 14 days for a full refund. Freight costs associated with the return are the responsibility of the customer unless otherwise agreed.",
  },
  {
    title: "Non-Returnable Goods",
    body: "Cut sections and specially ordered parts are non-returnable.",
  },
  {
    title: "Final Sale",
    body: "Returns outside the 14-day period are accepted at the sole discretion of Central Coast Auto Parts.",
  },
] as const;

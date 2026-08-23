/**
 * The warranty and shipping wording shown on every part page.
 *
 * Carried across from the current site word for word. It states the warranty
 * period customers have been sold on, so it is not something to reword: if it
 * needs to change, it changes with the owner, not with a redesign.
 */

export const WARRANTY = {
  intro:
    "All used mechanical parts supplied by Central Coast Auto Parts come with a standard 3-month parts-only warranty. Optional extended warranty and labour cover are available on selected items for added peace of mind.",
  points: [
    "All second-hand mechanical parts are supplied with a 3-month parts-only warranty",
    "Extended warranty options are available on selected parts, with the choice of longer coverage and parts-and-labour protection",
    "Warranty covers the supplied part only and excludes labour, freight, and any consequential costs; correct installation and servicing are required to maintain coverage",
  ],
} as const;

export const SHIPPING = {
  intro:
    "We ship parts Australia-wide where possible. Delivery cost is calculated at checkout from your delivery address and the size and weight of your order.",
  points: [
    "Shipping charges are shown before you pay (based on address and parcel details).",
    "You can choose local pickup where available, select or confirm during checkout.",
    "Allow standard carrier transit times; remote areas may take longer.",
    "For bulky or heavy items, our team may contact you to confirm freight options.",
  ],
} as const;

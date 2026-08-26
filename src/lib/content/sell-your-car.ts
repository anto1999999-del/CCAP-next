/**
 * The written content on the Sell Your Car page.
 *
 * The page was a hero and a form and 207 words, which is thin for a page meant
 * to rank for "sell my car Central Coast" and its variants. Everything here is
 * new copy and every word of it is listed in docs/SEO-ADDITIONS.md for the
 * owner to approve before it goes live.
 *
 * Written from what the site and the business already say elsewhere: the yard
 * is a licensed dismantler at Berkeley Vale, it buys damaged and non-running
 * vehicles, and it pays on the spot. Nothing here invents a figure, a timeframe
 * or a guarantee that is not already claimed on the current site.
 */

export const SELL_STEPS = [
  {
    step: "1",
    title: "Tell us about the car",
    body: "Fill in the form with the make, model, year and condition. The odometer reading and whether it still drives are the two things that move the number most, so include them if you know them.",
  },
  {
    step: "2",
    title: "We come back with a price",
    body: "Someone from the yard reviews it and calls or emails you, usually the same business day. If we need a photograph or two before we can be accurate, we will ask.",
  },
  {
    step: "3",
    title: "We collect it",
    body: "Agree the price and we arrange pickup across the Central Coast, Newcastle and Sydney. You do not need to get it running or drive it anywhere.",
  },
  {
    step: "4",
    title: "You get paid",
    body: "Payment happens on collection, not weeks later. Bring the registration papers and your photo ID so the transfer can be done properly on the day.",
  },
] as const;

export const WE_BUY = [
  {
    title: "Damaged and written-off cars",
    body: "Hail, flood, front or rear impact, or a statutory write-off. A car that is not worth repairing is still worth money in parts.",
  },
  {
    title: "Cars that will not start",
    body: "Blown engine, failed gearbox, or something that has sat under a tarp for three years. Non-runners are ordinary for us.",
  },
  {
    title: "Unregistered and unroadworthy",
    body: "Expired registration is not a problem. We do not need a roadworthy certificate to buy a car we are dismantling.",
  },
  {
    title: "Vans, utes and light commercials",
    body: "Not just passenger cars. Vans, utes, 4x4s and light commercial vehicles are all bought on the same terms.",
  },
  {
    title: "High-kilometre trade-ins",
    body: "The car a dealer would not take. High kilometres matter far less to us than what condition the major components are in.",
  },
  {
    title: "Most makes and models",
    body: "Japanese, Korean, European and Australian. If we have customers asking for its parts, we are interested in the car.",
  },
] as const;

/**
 * What people ask before they fill the form in.
 *
 * Answers lead with the answer and then explain, which is what both a reader
 * skimming the page and an answer engine quoting it need. These are published
 * as FAQPage structured data.
 */
export const SELL_FAQS = [
  {
    question: "Do you buy cars that do not run?",
    answer:
      "Yes. We buy non-running, damaged and written-off vehicles, and a car that will not start does not need to be made to start before we collect it. What matters is the condition of the parts that come off it.",
  },
  {
    question: "Does the car need to be registered?",
    answer:
      "No. We buy unregistered and unroadworthy vehicles. You will still need the registration papers and photo identification so the ownership transfer is done correctly.",
  },
  {
    question: "How much is my car worth?",
    answer:
      "It depends on the make, model, year, kilometres and which parts are still good, so we price each car individually rather than quoting from a table. Fill in the form and we will come back to you with a real number.",
  },
  {
    question: "Do you pick the car up?",
    answer:
      "Yes. We arrange collection across the Central Coast, Newcastle and Sydney. You do not need to arrange a tow or drive the car anywhere.",
  },
  {
    question: "When do I get paid?",
    answer:
      "On collection. Payment is made when we take the vehicle, not after it has been dismantled or sold.",
  },
  {
    question: "What do I need to have ready?",
    answer:
      "The registration papers and your photo identification. If the vehicle is under finance, that needs to be settled before ownership can transfer.",
  },
] as const;

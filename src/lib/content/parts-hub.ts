/**
 * The written content on the parts hub at /parts.
 *
 * The page was a hero and eight category tiles and 232 words, which is thin for
 * the page that sits above every category. New copy, all of it listed in
 * docs/SEO-ADDITIONS.md for the owner to approve.
 *
 * Written from what the site already states elsewhere: parts are inspected
 * before sale, major components carry a warranty, freight goes Australia-wide
 * from Berkeley Vale, and the yard holds far more than is listed online. No
 * figure, timeframe or guarantee here is new.
 */

export const BUYING_STEPS = [
  {
    title: "Find the part, or ask us",
    body: "Search the catalogue by make, model, year and part type. What is listed is what is on the shelf today, and the yard holds far more than is photographed, so call if you cannot see it.",
  },
  {
    title: "Check it fits",
    body: "Every listing names the vehicle the part came off and the years it fits. If you are unsure whether it suits yours, give us the build date and we will check before you buy.",
  },
  {
    title: "We inspect before it ships",
    body: "Parts are checked before they leave, and major components are sold with a warranty. Electrical items are tested rather than sold as seen.",
  },
  {
    title: "It gets to you",
    body: "Freight is priced at checkout from the size and weight of what you have ordered, and goes Australia-wide. Or collect it from Berkeley Vale and pay nothing for delivery.",
  },
] as const;

export const PARTS_FAQS = [
  {
    question: "How do I know a used part will fit my car?",
    answer:
      "Each listing shows the vehicle the part was removed from and the year range it fits. Fitment often spans several model years, so a part off a 2021 car frequently suits a 2018. If you are not certain, call with your build date and VIN and we will confirm before you order.",
  },
  {
    question: "Are used car parts cheaper than new ones?",
    answer:
      "Considerably. A second-hand part is typically a fraction of the dealer price for the same component, which is why smash repairers and mechanics buy them. On older vehicles it is often the difference between repairing the car and writing it off.",
  },
  {
    question: "Do used parts come with a warranty?",
    answer:
      "Major components are sold with a warranty. The full terms, including what is covered and the returns window, are on our terms and conditions page.",
  },
  {
    question: "What if the part I need is not listed?",
    answer:
      "Ring the yard. The catalogue shows what has been photographed and entered, and there is always more on the shelf than that. We can also source parts we do not hold ourselves.",
  },
  {
    question: "Can I collect instead of paying for delivery?",
    answer:
      "Yes. Choose pickup at checkout and no delivery is charged. Collection is from Berkeley Vale during trading hours.",
  },
  {
    question: "Do you supply trade customers?",
    answer:
      "Yes. We supply smash repairers, mechanics, insurers and fleet operators, as well as people buying one part for their own car.",
  },
] as const;

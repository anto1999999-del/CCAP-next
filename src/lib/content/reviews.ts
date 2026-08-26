/**
 * The Google rating, in one place.
 *
 * The home page has emitted `AggregateRating` since the current site was built,
 * and nothing on the page ever showed it. Google's own guidance is that rating
 * markup must reflect a rating the visitor can see, so an invisible one is a
 * liability rather than an asset: at best ignored, at worst treated as markup
 * that describes something the page does not contain.
 *
 * So the figure lives here, the page reads it, and the structured data reads
 * the same value. The two cannot disagree, which is the whole point.
 *
 * `quotes` is empty on purpose. No customer review has been written by anyone
 * working on this site, and none will be: a quote nobody said is a fabricated
 * record, and review markup around it is a false statement made directly to
 * Google. When the yard supplies real ones they go in this array and the page
 * shows them.
 */

export type CustomerQuote = {
  /** As the reviewer wrote it. Not edited for tone or length. */
  quote: string;
  name: string;
  /** Suburb or town, where the reviewer gave one. */
  location?: string;
};

export const GOOGLE_REVIEWS = {
  /**
   * Read off the Business Profile on 26 August 2026: "5.0, 126 Google reviews".
   *
   * The current live site claims 103, which was true whenever it was written
   * and has not been touched since. A third-party directory said 118. Neither
   * was used: this is the profile's own figure, which is the only one Google
   * will check it against.
   *
   * It goes up. Check it at launch and whenever the site is next worked on,
   * and if it ever cannot be confirmed, delete the aggregate block rather than
   * let the page state a number nobody can stand behind.
   */
  ratingValue: 5.0,
  reviewCount: 126,
  verifiedOn: "2026-08-26",

  /**
   * Where a visitor goes to read them.
   *
   * A plain search rather than the owner's own result link, which carried an
   * `authuser` parameter tying it to one signed-in account.
   */
  profileUrl:
    "https://www.google.com/search?q=Central+Coast+Auto+Parts+Berkeley+Vale",

  /**
   * Real reviews, from the Business Profile, on 26 August 2026.
   *
   * Reproduced word for word, including the spelling and the punctuation as
   * each person typed it. Tidying a customer's review changes what they said,
   * and a quote that has been improved is no longer a quote.
   *
   * Only reviews whose full text was visible were used. Google truncates the
   * longer ones behind "View full review", and half a sentence is not somebody's
   * opinion.
   *
   * NOT marked up as `Review` structured data, deliberately. Google does not
   * allow a business to publish review markup about itself: that is the
   * self-serving pattern its guidelines name, and it is ignored at best. These
   * are on the page for the people reading it.
   */
  quotes: [
    {
      quote:
        "I recently purchased a gearbox and I'm extremely happy with the product. The gearbox is in excellent condition with very low kilometres, exactly as described. It runs smoothly and performs really well. Harry and Anthony were both honest, helpful, and easy to deal with throughout the whole process.",
      name: "Resh Shankar",
    },
    {
      quote:
        "I had an excellent experience with Central Coast Auto Parts. The parts I picked up were clean, well presented, and exactly what I needed. The team went the extra mile to help me out, and you can tell they genuinely care about their customers.",
      name: "Anthony Cook",
    },
    {
      quote:
        "Bought a rear LHS blinker unit for Subaru, was exactly what was advertised and the Father son team couldn't do enough to help, great price as well really good experience Thanks guys",
      name: "reef1rat",
    },
    {
      quote:
        "Very honest and helpful staff and the yard boys know there stuff and very willing to help this is a very honest and fair business on prices",
      name: "Clinton Waterman",
    },
    {
      quote:
        "Fast responses, great price, easy to deal with and great transaction, thanks, happy to buy again from here for sure.",
      name: "Travers Wood",
    },
    {
      quote:
        "I received my order, and I must say the speed was impressive. It arrived very quickly.",
      name: "Artith Jariyap",
    },
  ] as CustomerQuote[],
} as const;

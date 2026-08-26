# Content added for SEO, awaiting approval

Everything on this page is **new writing that was not on the current site**. It
was added because the pages it sits on were too thin to rank, and it is listed
here so the owner can read every word and approve, change or remove it before
the site goes live.

Nothing here invents a figure, a timeframe, a guarantee or a credential. Every
claim is one the current site already makes somewhere else, restated on a page
where it was missing. Where a number would have helped and there was no source
for it, the copy says nothing rather than guessing.

**Nothing in this document is a customer review or a rating.** See the last
section for why.

---

## 1. Sell Your Car

The page was a hero, a form and 207 words. Three blocks were added.

**Source:** `src/lib/content/sell-your-car.ts`

### "From the form to being paid" — four steps

| Step | Claim made | Where it comes from |
| --- | --- | --- |
| 1. Tell us about the car | The form asks make, model, year, condition, odometer, drivable | The existing form fields |
| 2. We come back with a price | "usually the same business day" | The page already said "We come back to you the same day wherever we can" |
| 3. We collect it | Pickup across Central Coast, Newcastle and Sydney | The service areas already listed on About |
| 4. You get paid | "Payment happens on collection" | The hero already says "pay on the spot" |

**Please check:** step 4 says to bring registration papers and photo ID. That is
standard for a transfer, but confirm it matches what the yard actually asks for.

### "The car does not have to be worth fixing" — six things you buy

Damaged and written-off, cars that will not start, unregistered and
unroadworthy, vans and utes and light commercials, high-kilometre trade-ins,
most makes and models.

**Please check:** the claim that expired registration and no roadworthy
certificate are not a problem. Confirm that is true for how the yard buys.

### Six questions and answers

Do you buy cars that do not run / does it need to be registered / how much is my
car worth / do you pick it up / when do I get paid / what do I need to have
ready.

These are published as `FAQPage` structured data, so they can be quoted directly
in a Google result or by an AI assistant. That is the main reason they exist.

**Please check:** "If the vehicle is under finance, that needs to be settled
before ownership can transfer." Correct in general, but confirm it is how you
want it stated.

---

## 2. Parts hub (/parts)

The page was a hero and eight category tiles, 232 words. Two blocks were added.

**Source:** `src/lib/content/parts-hub.ts`

### "How it works" — four points

Find the part or ask us, check it fits, we inspect before it ships, it gets to
you. All four restate things the site says on the product pages and at checkout.

### Six questions and answers

How do I know it will fit / are used parts cheaper / do they come with a
warranty / what if it is not listed / can I collect / do you supply trade.

**Please check two answers in particular:**

- "Major components are sold with a warranty" — this is what About and the
  product pages already say. The FAQ points at the terms page for the detail
  rather than repeating a period, so the two can never disagree.
- "We can also source parts we do not hold ourselves." Confirm that is true.

---

## 3. What was changed rather than added

Not new content, but changes to what search engines see. Listed for the record.

| Change | Was | Now |
| --- | --- | --- |
| Home title | 77 characters | 59 |
| Products title | 73 | 54 |
| About title | 68 | 57 |
| Contact title | 72 | 51 |
| Sell Your Car title | 67 | 53 |
| Terms title | 66 | 45 |
| Six category descriptions | 161 to 173 characters | all under 155 |
| `meta keywords` | The same list on every page | Removed |

**The meta keywords tag needs a decision.** It is on the current live site. It
also does nothing: Google has ignored it since 2009 and no major engine reads
it. It was declared once in the layout here, so every page carried the identical
list, which meant Sell Your Car was telling crawlers its keywords were "buy used
engines NSW". It is currently removed. Restoring it is one line if you want it
back.

**The 88 blog articles have not been touched.** Their titles and descriptions
came from Yoast, they rank now, and one of them is the third most-visited page
on the site. Sixty-seven of them are longer than the 60-character guideline.
Rewriting them is textbook advice and also the easiest way to lose rankings that
already exist, so they stay exactly as they are unless the owner asks otherwise.

---

## 4. Testimonials and ratings: not added, and why

The brief asked for testimonials, pulled from the Google Business Profile if
needed, and for review markup.

**No reviews or ratings have been written.** Inventing a customer quote, or a
star rating, would be fabricating a record: it puts words in the mouth of a
customer who never said them, and `AggregateRating` markup makes a false claim
directly to Google. Google's own guidelines treat invented review markup as
spam, and it is exactly the kind of thing that earns a manual penalty rather
than a ranking.

There is an existing rating to check, though. `src/lib/schema/business.ts`
emits an `AggregateRating` of **5.0 from 103 reviews** on the home page. That
was carried across faithfully from the current site, where it sits in
`src/pages/Home.jsx`, so it is the owner's own figure and not something invented
in the rebuild.

It still needs confirming before launch, for two reasons. Review counts only go
up, so 103 is probably out of date. And Google is entitled to check a rating
against the profile it belongs to: if the number on the page and the number on
the Business Profile disagree, the markup is a liability rather than an asset.

To do this properly, send me either:

- the Google Business Profile link, so the real rating and count can be read and
  the existing markup verified, or
- real quotes with the customer's first name and suburb, as they were written.

Then the testimonials go on the page and the markup describes something true.

---

## How to reject any of this

Every block above lives in its own file. Deleting the entry from
`src/lib/content/sell-your-car.ts` or `src/lib/content/parts-hub.ts` removes it
from the page; nothing else depends on it.

# Content added for SEO

**Approved by the owner on 27 August 2026** for the three claims he was asked
about directly. See "What was approved" below for what that did and did not
cover.

Everything on this page is **new writing that was not on the current site**. It
was added because the pages it sits on were too thin to rank, and it is listed
here so the owner can read every word and approve, change or remove it before
the site goes live.

Nothing here invents a figure, a timeframe, a guarantee or a credential. Every
claim is one the current site already makes somewhere else, restated on a page
where it was missing. Where a number would have helped and there was no source
for it, the copy says nothing rather than guessing.

The one exception is the reviews section, which is **not** new writing: it is
six real Google reviews reproduced word for word, and the real rating from the
Business Profile. See section 4.

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

**APPROVED 27 Aug 2026.** Step 4 says to bring registration papers and photo ID.

### "The car does not have to be worth fixing" — six things you buy

Damaged and written-off, cars that will not start, unregistered and
unroadworthy, vans and utes and light commercials, high-kilometre trade-ins,
most makes and models.

**APPROVED 27 Aug 2026.** Expired registration and no roadworthy certificate
are not a problem.

### Six questions and answers

Do you buy cars that do not run / does it need to be registered / how much is my
car worth / do you pick it up / when do I get paid / what do I need to have
ready.

These are published as `FAQPage` structured data, so they can be quoted directly
in a Google result or by an AI assistant. That is the main reason they exist.

**Not asked, and left in.** "If the vehicle is under finance, that needs to be
settled before ownership can transfer." It is true of any sale in Australia
rather than a claim about this business, so it carries no risk of promising
something the yard does not do. Worth a look at the wording when there is time.

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

- **Not asked, and left in.** "Major components are sold with a warranty" is
  already on About, on every product page and on the terms page of the current
  live site, so it is the business's own existing claim rather than a new one.
  The FAQ points at the terms page for the detail instead of repeating a
  period, so the two can never disagree.
- **APPROVED 27 Aug 2026.** "We can also source parts we do not hold
  ourselves."

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

## 4. Reviews on the home page

**Source:** `src/lib/content/reviews.ts`, shown by
`src/components/sections/Reviews.tsx` on the home page.

### The rating

**5.0 from 126 Google reviews**, read off the Business Profile on 26 August
2026.

This corrects a real problem rather than adding decoration. The home page has
been sending Google an `AggregateRating` of **5.0 from 103** since the current
site was built, and **nothing on the page ever showed it**. Google's guidance is
that rating markup must describe a rating the visitor can see, so an invisible
one is worth nothing at best. The figure now appears on the page, and the
structured data reads the same value from the same file, so the two cannot
disagree.

A third-party directory reports 118. That was not used. Only the profile's own
number was, because that is the one Google checks against.

**It goes up.** Check it before launch and whenever the site is next worked on.

### Six real reviews

Taken from the Business Profile screenshots, **word for word**, including the
spelling and punctuation as each person typed them. Tidying a review changes
what somebody said.

| Reviewer | What it demonstrates |
| --- | --- |
| Resh Shankar | A gearbox, low kilometres, "exactly as described" |
| Anthony Cook | Parts clean and well presented, the team going further |
| reef1rat | A specific part, a Subaru blinker, as advertised |
| Clinton Waterman | Honest staff and fair prices |
| Travers Wood | Fast responses and price |
| Artith Jariyap | Delivery speed |

They were chosen to cover a different thing each, because six reviews all saying
"great service" persuade nobody.

**Only reviews whose full text was visible were used.** Google hides the longer
ones behind "View full review", and half a sentence is not somebody's opinion.

**Two things to check:**

1. **Typos are reproduced.** Clinton Waterman's says "the yard boys know there
   stuff", and Nathan's said "number1". That is what they wrote. Correcting a
   customer's review is editing it; leaving it is honest but looks untidy.
   The owner's call, and it is a one-line change either way.
2. **"reef1rat" is a username, not a name.** It is how they appear on Google.
   Drop that quote if it looks odd beside the real names.

### What was deliberately NOT done

**No `Review` structured data around these quotes.** Google does not allow a
business to publish review markup about itself: that is the "self-serving
review" pattern its guidelines name specifically, and it is ignored at best. The
quotes are on the page for people to read, not to manufacture stars in a search
result.

Worth knowing about the aggregate too: a rating a business publishes about
itself is generally not eligible for rich results either. Its value here is that
the page and the markup now tell the truth and tell it consistently, not that it
will put stars next to the listing.

**Nothing was invented.** No quote, no name and no number on this site was
written by anyone working on it.

---

## How to reject any of this

Every block above lives in its own file. Deleting the entry from
`src/lib/content/sell-your-car.ts` or `src/lib/content/parts-hub.ts` removes it
from the page; nothing else depends on it.


---

## What was approved

On 27 August 2026 the owner was asked three questions and answered yes to all
three:

1. Do you buy cars with expired registration and no roadworthy certificate?
2. Do customers bring registration papers and photo ID when you collect?
3. Can you source parts you do not hold in the yard?

Those are the three claims in this document that state something about how the
business operates and that were not already published somewhere on the current
site. They are approved and are live in the copy.

Two further lines were flagged in this document but not put to him, because
neither is a new claim about the business:

- The warranty on major components, which the current site already states on
  About, on every product page and in its terms.
- That finance must be settled before ownership transfers, which is true of any
  vehicle sale in Australia.

Neither is a risk. Both are worth a read when there is time.

**Everything else here is a change to titles, descriptions and structure**, not
to what the business claims, and needs no approval.

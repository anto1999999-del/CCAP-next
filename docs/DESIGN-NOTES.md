# Design notes — findings from the current site

The brief is to match the current design exactly and flag anything broken
rather than silently change it. This is that list. Nothing here has been
"fixed" in the rebuild; each item is reproduced as-is until a decision is made.

## Confirmed against the live site

Measured from computed styles on `centralcoastautoparts.com.au`, not from the
stylesheets — the two disagree, and the stylesheets are misleading.

| Property | Live value |
|---|---|
| `body` font | `Arial, Helvetica, sans-serif` |
| `body` background | `#000000` |
| `body` colour | `#ffffff` |
| `body` font-style | `normal` |

## Flagged for a decision

### 1. Three different reds for the same hover state
`#d11428`, `#c41226` and `#c11227` all appear as the hover colour for the brand
red `#e9162f`. They are close enough to be invisible side by side and almost
certainly drift rather than intent. All three are preserved as tokens.
**Decision needed:** consolidate to one.

### 2. Two fonts shipped, neither ever loaded
`Geom-Graphic-W03-Bold-Italic.ttf` is committed three times (`public/`,
`src/CSS/`, `dist/`) and a `rubik` family is named in `services.css`, but there
is no `@font-face` rule anywhere in the codebase. Neither font has ever
rendered; the site has always fallen back to Arial.
**Decision needed:** was a custom font intended? If so it needs loading properly;
if not, the files should go.

### 3. Global styles loaded from a component
`src/CSS/index.css` sets `body` rules — background, `font-style: italic`,
`letter-spacing: 1.5px`, `max-width: 2300px` — and is imported by `Hero.jsx`.
Because `Home` is lazy-loaded, those global rules only take effect once a
visitor has reached the home page, and then persist for the rest of the session.
The live site computes `font-style: normal`, so they are being overridden
anyway, but the arrangement means appearance could depend on navigation order.
**Not reproduced in the rebuild** — global styles belong in the global
stylesheet. Raised here because it is a behaviour change, however invisible.

### 4. Conflicting body backgrounds
`src/index.css` sets `#1c1c1c`; `src/CSS/index.css` sets `#191919 !important`.
Neither wins — the live site computes `#000000`. Two of the three values in the
codebase are simply wrong.

### 5. Seven dead stylesheets
`List.css`, `about.css`, `footer.css`, `parts.css`, `services.css`,
`single.css`, `terms.css` — roughly 1,100 lines — are imported by nothing.
They are not being carried across.

## Surface ramp

Twelve near-identical dark values are in use. They are preserved exactly and
named by role in `globals.css`, but they read as accumulation rather than a
designed scale. Worth revisiting once the port is complete and the real usage
of each is visible in one place.

### 5b. Social profiles — RESOLVED 19 Aug 2026
The footer and the structured data pointed at different Facebook, eBay and
Gumtree accounts. Confirmed with the owner:

- **Facebook** — both are genuine: one is the Page, one the Marketplace profile.
  `sameAs` lists both; the footer links to Marketplace, where customers buy.
- **eBay** — `/usr/central_coast_auto_parts` redirects to
  `/str/centralcoastautopartsaus`, so the `/str/` form is canonical.
- **Gumtree** — `/web/s-user/1499623032693` is the live seller profile. The
  `/s-seller/...` URL previously in the structured data is not.

### 6. The same category is named two different things
Home calls the fifth "What We Supply" card **Suspension & Steering**; About
calls the identical card, with identical wording, **Mechanical Components**.
Both are preserved so neither page loses a phrase it may rank for, via an
override in `lib/content/sections.ts`.
**Owner's decision, 19 Aug 2026: keep both.** The override stays.

### 7. Fixed while porting About
Recorded here because they were real defects, not styling choices:

- The hero background pointed at `/src/image/AboutUs.webp` — a build-source
  path. It resolved only because the raw `src/` tree is publicly served from the
  production webroot. Now a normal asset under `/images/`.
- The hero used `items-LEFT`, which is not a class in any framework and did
  nothing.
- The hero had no overlay, so the white heading sat directly on a photograph
  and its contrast depended entirely on which part of the image was behind it.
  A 45% black scrim now guarantees it.

### 8. Terms page had no metadata of its own
It set no title, description or canonical, so it inherited the home page's —
two different pages telling Google they are the same thing. It also had 23 `h2`
headings and no `h1`. Both fixed; the copy is untouched.

### 9. Prata is requested but never loaded
Terms headings carry `font-family: "Prata", serif`, and no `@font-face` or font
link for Prata exists anywhere in the codebase, so they fall back to the
browser's default serif while the rest of the site is Arial. Reproduced exactly.
**Owner's decision, 19 Aug 2026: dropped.** Terms headings now use the site
font like everything else. No font file to load, and one less inconsistency.

### 10. The contact block existed in two versions
The footer rendered one version on every page not named in two hardcoded path
lists; Home, About, Contact and Sell Your Car embedded a second directly. They
differ in heading size and rule width. Now one component used everywhere.

### 11. Brand red is not readable as small text — RESOLVED 19 Aug 2026
`#e9162f` scored 3.16 to 4.48 against the dark surfaces it sits on, under the
4.5 minimum for body text, and worst exactly where it is used most (the
Address/Phone/Email labels on `#2a2a2a`).

A second token, `--color-brand-text: #f06172`, is the same hue lightened 32%
toward white. It clears 4.5 everywhere (4.55 worst, 6.46 best) and still reads
as the brand red. Applied to small text only — buttons, fills, rules and
headings 24px and over keep `#e9162f`, which passes on its own at the 3.0
threshold that applies to large text.

All six pages now pass WCAG AA, verified by measuring computed colours against
their effective backgrounds.

## 12. Vehicle gallery meta was auto-generated and unusable

The 26 gallery vehicles came across from WordPress with Yoast meta that had
clearly been generated, not written: four descriptions repeat themselves
mid-sentence, several run past 400 characters (Google shows about 160), and two
titles contain the vehicle name twice. Titles and descriptions for
`/gallery/<vehicle>` are therefore written by the template instead of carried
across. The 87 articles have hand-written meta and keep theirs untouched.

## 13. Em and en dashes removed site-wide

At the owner's instruction, no em or en dash appears anywhere on the site. Our
own copy was reworded; the 197 in the imported WordPress posts are converted as
the content loads (`withoutDashes` in `src/lib/blog/html.ts`), so re-running the
exporter cannot bring them back. A dash between two numbers becomes a hyphen so
ranges keep their meaning; everywhere else it becomes a comma.

## 14. Gallery wording deliberately avoids "every" and "in the yard"

The gallery shows 26 photographed cars, which is a fraction of what the yard
parts out. Copy that implied it was the full list ("every vehicle in the yard",
"in the yard right now") was removed so the page reads as a showcase, not an
inventory.

## 15. The parts catalogue is now server rendered

On the current site /products fetches its parts from the browser, so the HTML
that arrives contains a spinner and nothing else. Search engines index that
spinner: thirty thousand parts, and none of them are visible to a crawler.
Filtered views have no URL of their own either, because the page keeps filters
and the page number in component state, so a filtered catalogue cannot be
linked to or shared.

The rebuilt page renders on the server and puts the filters in the URL. The
filter panel is an ordinary form, so it works before JavaScript loads and every
combination is a real, indexable address.

## 16. Supplier credentials were committed to the old repository

`backend/utils/carpartsApi.js` contains the Pinnacle username and password in
plain text, so they are in that repository's git history. The rebuild reads them
from the environment, but that does not undo the exposure: **the password should
be rotated with Pinnacle**, and the new one set only in the server's `.env`.

## 17. The catalogue sync, and what it produces

`node scripts/sync-parts-catalog.mjs` pulls the whole catalogue from the
supplier. It takes about 35 minutes: the supplier caps a page at 10 rows and the
catalogue is 3,376 pages, and the run is deliberately paced so it is not
rate-limited. It should run overnight, the way the old one did.

The last run: **32,698 parts**, 32,635 of them with more than one photograph.
That produces a 22MB catalogue and 291MB of photograph records, and the split
between them is why the site can hold the catalogue in memory at all. The
photographs are written across 256 files of about a megabyte, a line at a time
as the sync runs, so neither the sync nor the site ever holds all 291MB.

Pages read the catalogue from disk once and re-read only when the file changes,
so a sync is picked up without a restart.

## 18. Part photographs: why none of them loaded, and why they were slow

Two separate problems, found together.

**They did not load at all.** The catalogue records image paths as
`/v1/image/...`, but the supplier serves them from `/ops/v1/image/...`. Asking
for the path as recorded returns a redirect that goes nowhere, so every
photograph failed. The old site got this right by prefixing `/image-proxy/ops`
in the browser, which is why the bug did not exist there.

Worth recording how it was missed: the check counted images left in the page
that had failed to load. The card replaces a failed photograph with its own
"No photo" box, so failed images were no longer in the page to be counted, and
the check reported success. Counting what is present cannot detect what is
absent.

**They were slow.** The supplier takes one to three seconds per image, so a grid
of twenty parts cost about two seconds an image on a cold cache.
`scripts/warm-part-images.mjs` now fetches every thumbnail once through the
site, after a sync, at about ten a second, so a customer's first view is already
on disk. Measured after warming: the page's HTML in 51ms and its twenty
photographs in 46ms each, against 1,921ms each before.

The cache lives in `.cache/part-images` inside the project, not the system temp
directory, which gets cleaned out from under a long-running server and would
throw the warm-up away. `PART_IMAGE_CACHE_DIR` moves it.

**On the droplet, after each nightly sync, run the warm-up:**

    node scripts/sync-parts-catalog.mjs
    node scripts/warm-part-images.mjs --base http://localhost:3000

## 19. The catalogue's expensive work is cached against the catalogue itself

Filtering 32,698 parts, deriving which years and makes exist, and spreading the
results across vehicles costs about 100ms, and it was being repeated on every
request for an answer that cannot change until the next sync. Results are now
kept against the catalogue array itself, so a sync replaces it and everything
cached from it is dropped: there is no expiry to tune and nothing to invalidate
by hand.

Measured on a production build: a filtered page falls from 388ms to 29ms when it
is asked for a second time, and paging inside those filters is 19ms.

## 20. The supplier's image host drops about one request in twenty

Warming 21,968 images end to end, 1,410 failed. That number looked like missing
photographs, and it is not: a random sample of 25 of them all answered when
asked again. The supplier drops requests under sustained load.

Two consequences, both handled:

The warm-up retries once after a pause, and treats a 404 as final rather than
retrying it. Without that it left about 1,400 photographs cold and reported them
as missing.

A photograph that fails in the browser falls back to the part's other copy of
the same image before it falls back to the words "No photo". The large and small
copies are separate files that fail independently.

Genuinely missing photographs do exist, but they are rarer and they come in
pairs: across 402 parts checked, every part whose large copy returned 404 was
missing its small copy too. 38 distinct small copies are gone for good.

## 21. The category landing pages are carried across, and now link to stock

`/parts` and its seven category pages (`/parts/engines`, `/parts/gearboxes` and
so on) were missing from the rebuild until now. They are the pages that rank for
"used engines for sale NSW" and similar, so their titles, descriptions, headings
and body copy are carried across word for word: 94 of the 96 copy strings match
the live page exactly, and the other two differ only by the site-wide dash rule.

Two deliberate changes:

The questions already on those pages now carry FAQPage structured data. Same
wording; it was previously invisible to search engines.

Each page links into the catalogue filtered to its own part type where the
supplier codes one cleanly (engines, gearboxes). The live pages send everybody
to the unfiltered catalogue, so a reader who has just read about engines has to
find the engines again. The other five categories span many codes, so they link
to the whole catalogue rather than to a fraction of their stock presented as all
of it.

An unknown slug is a 404 rather than a redirect to /parts. The live behaviour
answers 200 at any invented address under /parts/, which is a soft 404.

## 22. A gearbox search on the live site returns nothing

The alias table maps "gearbox" and "transmission" to the code GEARBOX. The
catalogue has no such code: all 234 gearboxes are filed under TRANS_GEARBOX. So
every gearbox search and every gearbox filter on the live site comes back empty,
and has for as long as that table has existed.

Both codes are now accepted, and a test pins it, because this is exactly the
kind of thing that gets silently reverted by someone tidying the alias list.

## 23. Anyone can choose what they pay on the current site

The checkout works the total out in the browser and posts it:

    const { amount, customerId, userEmail } = req.body;
    ...
    paymentIntents.create({ amount })

Nothing between that request and Stripe re-checks the price against the
catalogue. Editing one number in the request buys a $3,300 engine for the
fifty-cent minimum, and the order arrives looking ordinary.

`src/lib/orders/pricing.ts` takes only which parts and how many. Every price is
read from the catalogue on the server, quantities are clamped, parts that have
sold or have no price are reported rather than guessed at, and freight is added
as a separate figure. The tests exist mainly to hold that line: one of them
sends a price in the request and asserts it is ignored.

**This is worth fixing on the live site before the rebuild ships**, since it is
live now. The change is to re-price the order server-side in
`create-payment-intent` rather than trusting `req.body.amount`.

## 24. The live site quotes freight from the carrier's test system

`shippingController.js` hardcodes `api-uat.teamglobalexp.com`, which is Team
Global Express's user acceptance testing environment. Every freight price quoted
to a customer comes from there. Whether those prices match production is a
question for the carrier.

The endpoint is `TGE_RATE_URL` in the rebuild, defaulting to the same UAT host so
nothing changes by accident. The carrier credentials moved out of the source
file to the environment, as with the parts API.

## 25. The sitemap and robots.txt are generated, not maintained by hand

The live sitemap lists twelve URLs and has fallen behind: no parts hub, no terms
page, and nothing that used to live on the blog subdomain. Both files are now
generated from the same data the pages are built from, so they cannot drift.

What is listed: the 9 site pages, the 7 category pages, 87 articles, 26 gallery
vehicles, and 24,115 priced parts. That is 24,244 URLs, split across four files
because one file of that size is unwieldy.

Unpriced parts are left out. Their page says "contact for price" and little
else, so there is nothing for it to rank on, and a crawler's time is better
spent on the 24,115 that can sell something.

Two traps worth recording. A chunked sitemap is served at /sitemap/0.xml and so
on with **no index at /sitemap.xml**, so robots.txt names every file rather than
pointing at an address that would 404. And the `id` handed to the sitemap
function is a promise in this version of Next: comparing it without awaiting is
silently false, which serves the same file for every chunk and looks like it
worked.

Static robots.txt and sitemap.xml files had been left in public/ from the old
site. They shadow the generated routes, so they are gone.

## 26. The catalogue had no working search, so one was added

The old codebase has a SearchBar component, and it never appears: it only
renders when the path contains "collection", and no such path exists on this
site. So 32,698 parts have only ever been reachable by paging through them or
narrowing the four dropdowns.

There is now a search box on /products. Like the filters it is a plain GET form,
so it works without JavaScript and every search has a shareable URL, and it
carries the current filters with it: searching inside a chosen make narrows that
make rather than throwing the choice away.

**This is an addition to the design rather than a port**, so it is recorded here
for the owner to accept or reject. Measured: "alternator" finds 280 parts,
"hilux" 5, "kia cerato gearbox" 6.

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

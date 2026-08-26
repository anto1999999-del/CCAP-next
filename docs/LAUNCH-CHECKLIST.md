# Launch checklist

Written on 26 August 2026 from a debug pass over the whole site. Everything here
is either something that must be set on the production server, or something that
has been checked and is listed so nobody checks it twice.

---

## 1. Environment variables

The site reads these. Anything missing has a fallback, and for two of them the
fallback is silently worse rather than obviously broken.

### Must be set, or something is quietly wrong

| Variable | If missing | Where to get it |
| --- | --- | --- |
| `RECAPTCHA_SECRET_KEY` | **Spam protection is off.** `verifyRecaptcha` returns "not-configured" and every form treats that as a pass. The forms work; nothing is checked. | Already on the droplet, in the old API's `.env` |
| `MONGO_URI` | Accounts, orders, blog and gallery all fail | Already on the droplet |
| `SESSION_SECRET` | Sign-in throws. Must be 24+ characters | Already set locally |
| `RESEND_API_KEY` | Contact and sell-your-car emails are never sent | Already on the droplet. **Rotate it: it was pasted into a chat transcript** |
| `MEDIA_DIR` | Uploaded images write into the deploy directory and vanish on the next deploy | Set to `/srv/ccap-media`, owned by the service user |
| `NEXT_PUBLIC_SITE_ORIGIN` | Canonicals and OG tags resolve against the wrong host | The production domain |

The reCAPTCHA one is the one to watch. A missing Stripe key makes the checkout
say so on screen. A missing reCAPTCHA key looks exactly like a working site
until the enquiry inbox fills with spam.

Rate limiting is on every form regardless, so the site is not defenceless
without it: the contact form and the sell-your-car form are limited per client,
and sign-in, registration, password reset, checkout quotes and payments each
have their own limit. But a rate limit slows a bot down; it does not identify
one.

### Payment: tested end to end on 27 August 2026

All three are set locally with **sandbox** keys and the whole flow has been run:

| Variable | Notes |
| --- | --- |
| `STRIPE_SECRET_KEY` | `sk_test_`. Checkout says "card payment is not switched on" until this and the publishable key are both present |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_`. **Anything named `NEXT_PUBLIC_` is compiled into the JavaScript every visitor downloads.** The two were pasted in swapped once, which would have published the secret key on the website. Check the prefixes match the names |
| `STRIPE_WEBHOOK_SECRET` | `whsec_`. Without it cards charge and **no order is ever marked paid** |

What was proven, against the real sandbox:

- An order for $500 of parts plus a live $39.08 carrier quote created a
  PaymentIntent for exactly $539.08, with the split in its metadata.
- **The price cannot be tampered with.** The cart was edited in browser storage
  to make a $500 gearbox cost $1. The server priced it from the catalogue and
  charged $539.08 anyway. This is the flaw the current live site has.
- **An unpriceable address cannot be paid for.** When the carrier failed, the
  summary said "Call us for a price" and the pay button was disabled.
- **The webhook works.** After the payment succeeded, the order moved from
  "Awaiting payment" to Pending with a `paidAt` timestamp on its own. The
  current live site has no webhook at all, so it has never had this.

For production the webhook secret does **not** come from the CLI. Create the
endpoint in the Stripe dashboard at Developers → Webhooks, pointing at
`https://centralcoastautoparts.com.au/api/stripe/webhook`, subscribed to
`payment_intent.succeeded`, and use the signing secret it gives you.

Live keys are a separate step and still outstanding. The live secret key that
was in the droplet's `.env` has been exposed in a chat transcript and needs
rolling with a 24-hour overlap, not reusing.

### Have working defaults, set only to override

`PARTS_API_URL`, `PARTS_CATALOG_PATH`, `PART_IMAGE_CACHE_DIR`, `TGE_RATE_URL`,
`TGE_ACCOUNT_CODE`, `RECAPTCHA_MIN_SCORE`, `PARTS_SYNC_DELAY_MS`.

`JWT_SECRET` is only a fallback for `SESSION_SECRET`; setting one is enough.

---

## 2. Checked and correct

Run `node scripts/link-check.mjs <origin>` and `node scripts/seo-audit.mjs
<origin>` against production after deploying to repeat all of this.

| Check | Result |
| --- | --- |
| Internal links | **267 pages crawled, 0 broken, 0 unexpected redirects** |
| 404s | `/does-not-exist`, an unknown product, post, vehicle and category all return a real 404, not a 200 |
| Directory traversal | `/media/../../etc/passwd` and `/part-image/../../etc/passwd` both 404 |
| Search input escaping | `<script>alert(1)</script>` in the search box renders escaped, never as markup |
| Out-of-range pagination | `?page=99999`, `?page=-5` and `?page=abc` all clamp instead of erroring |
| Canonicals | Every page self-canonicalises; filtered and paginated views carry `noindex, follow` |
| Duplicate titles | None |
| Structured data | LocalBusiness, Product with `UsedCondition`, BreadcrumbList, FAQPage, BlogPosting, Vehicle |
| Freight quoting | Live quote to Newcastle returned $49.79 with a per-part breakdown |
| Unpriceable address | Says "call us for a price" and disables payment, rather than showing $0.00 delivery |

---

## 3. Deploy steps that are not code

**The blog subdomain must keep working.** `content/redirects/blog-redirects.conf`
holds 132 redirects from the WordPress URLs to the new ones, plus one rule
keeping every old image path alive. It goes on the
`blog.centralcoastautoparts.com.au` vhost, and that subdomain has to keep
resolving and keep its TLS certificate **indefinitely**. Those redirects are
load-bearing for the rankings and for the domains linking in. They are not a
temporary courtesy.

**Keep the nightly parts sync.** On the old server it is:

```
0 3 * * * cd /root/ccautoparts/ccautoparts-api && node updatePartsCache.js >> logs/parts-sync.log 2>&1 && pm2 restart ccautoparts-api
```

The new site needs the equivalent: refresh the catalogue, then reload.

**Do not wipe the old droplet.** It runs the mail server for
`@centralcoastautoparts.com.au`. Email loss is not recoverable.

**Submit one real enquiry** through the contact form and one through Sell Your
Car after deploying, and confirm both arrive. These send through Resend and
nobody has sent a live one from the new site.

---

## 4. Known and accepted

**`/products?page=99999` canonicalises to itself** even though it renders the
last page. It is `noindex`, so no search engine acts on that canonical, and
clamping it would mean loading the catalogue on every metadata request. Left as
it is deliberately.

**67 blog titles and 28 descriptions are over the length guideline.** They came
from Yoast, they rank now, and the owner has decided they stay as they are.

**`meta keywords` has been removed.** It is on the current live site and does
nothing: no major engine has read it since 2009. Restoring it is one line if the
owner wants it back.

**The rating says 5.0 from 126 reviews.** Read off the Business Profile on 26
August 2026. It only goes up, so check it before launch.

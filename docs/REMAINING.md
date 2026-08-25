# What is left, in order

Kept here so nothing is lost between sessions. Ticked off as it lands.

## Done

- Every public page: home, about, contact, sell your car, terms, 404
- Parts catalogue: filters, search, paging, part pages, image proxy and cache
- Part category landing pages (`/parts` and the seven below it)
- Blog (87 articles) and gallery (26 vehicles), images served from this site
- Cart, checkout with server-side pricing and live freight quotes
- Accounts, order history, admin back office
- Sitemap, robots.txt, redirects for the old URLs

## 1. Payment

The last piece of the customer-facing site.

- [ ] Stripe client reading its key from the environment
- [ ] Create the payment from the **server-computed** total, never the browser's
- [ ] Record the order as pending before payment, not after
- [ ] Webhook that verifies Stripe's signature and marks the order paid
- [ ] `/order-success`
- [ ] Confirmation email to the customer and the yard

**Blocked on:** `STRIPE_SECRET_KEY`. Only the live *publishable* key is in the
old repository; the secret lives in `backend/.env` on the droplet. Test keys are
what this should be built and checked against, not the live ones.

### Why this is not a straight port

The current flow is: the browser works out the total, asks the server to create
a payment for that amount, confirms the payment itself, and then posts the order
to be saved. There is no webhook anywhere in the old backend.

Two consequences, both live today:

1. The amount is whatever the browser sends, so a $3,300 engine can be bought
   for the fifty-cent minimum (design note 23).
2. Nothing server-side ever confirms the payment succeeded. An order posted
   directly to the endpoint is recorded and looks entirely ordinary to the yard.

So payment is rebuilt rather than copied: priced on the server, confirmed by a
signature-verified webhook.

## 2. Password reset

- [ ] `/forgot-password` and `/reset-password/[token]`
- [ ] Single-use token with an expiry, cleared when the password changes

**Blocked on:** `RESEND_API_KEY` to actually send. The code can be finished
without it; it just reports that it could not send.

## 3. One pass against real data

Accounts, orders and the admin pages are written against the live collections
and their existing shapes, but nothing has run a query.

- [ ] Sign in as a real customer, see their real orders
- [ ] Admin pages against real orders, including hide and restore
- [ ] Confirm existing bcrypt passwords verify unchanged

**Blocked on:** `MONGO_URI`.

## 4. Before it goes live

- [ ] Rotate the Pinnacle and Team Global Express credentials, which are in the
      old repository's git history (notes 16 and 24)
- [ ] Decide whether freight should keep quoting from the carrier's UAT
      environment, which is what happens today (note 24)
- [ ] Fix the payment amount vulnerability on the live site, or ship this
      rebuild, whichever comes first (note 23)
- [ ] Point `TGE_RATE_URL`, `PARTS_API_*`, `MONGO_URI`, `SESSION_SECRET`,
      `RESEND_API_KEY` and the Stripe keys at production values
- [ ] Nightly on the droplet: sync the catalogue, then warm the images
- [ ] Put the 132 blog redirects in front of the old blog subdomain

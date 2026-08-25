# Accounts, dashboard and admin: a complete handoff

Everything needed to rebuild this system on another site. Written to be handed
to somebody who has not seen this codebase, so it states the decisions and the
reasons, not only the shapes.

Built on Next.js 16 (App Router, React 19), Tailwind CSS v4, MongoDB, and server
actions. Where a decision depends on that stack it says so, and what to do
instead if the stack differs.

---

## 1. What the system is

Six pages behind a sign-in, sharing one frame:

| Route | Who | What it does |
| --- | --- | --- |
| `/login` | anyone | Google sign-in, email sign-in, registration |
| `/forgot-password` | anyone | asks for a reset link |
| `/reset-password/[token]` | anyone with a link | sets a new password |
| `/my-account` | signed in | their details, their recent orders |
| `/orders` | signed in | their full order history |
| `/dashboard` | admin | figures and charts |
| `/manage-orders` | admin | every order, searchable, status changes |
| `/manage-users` | admin | every account, admin rights, resets, deletion |

Plus one endpoint, `/api/session`, which tells the header who is signed in.

The account pages and the admin pages share the same frame, the same sidebar and
the same components. A customer sees two tabs, an admin sees five. **That is the
whole difference.** Do not build a separate "admin theme".

---

## 2. Packages and environment

```
npm install mongodb bcryptjs jose google-auth-library zod
npm install -D @types/bcryptjs
```

- **`jose`** signs the session cookie. Works in Node and on the edge; `jsonwebtoken` does not.
- **`bcryptjs`** rather than `bcrypt`, which needs native build tools that a
  small server often does not have.
- **`google-auth-library`** verifies Google ID tokens against Google's keys.

Environment variables:

| Variable | Purpose | Notes |
| --- | --- | --- |
| `MONGO_URI` | database | full connection string, database in the path |
| `SESSION_SECRET` | signs the session cookie | 24+ random characters. Changing it signs everyone out |
| `GOOGLE_CLIENT_ID` | verifies Google tokens (server) | same value as below |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | renders the Google button | public by design |
| `RESEND_API_KEY` | sends reset emails | any transactional mail provider works |
| `NEXT_PUBLIC_SITE_ORIGIN` | builds reset links | e.g. `https://example.com`, no trailing slash |

**Google Cloud Console**: the OAuth client's *Authorised JavaScript origins*
must list every origin the site runs on, including `http://localhost:3210` for
development. Missing that gives `Error 400: origin_mismatch` and nothing else.
Redirect URIs are not used by this flow.

---

## 3. Data model

Two collections. These shapes came from an existing Mongoose application, so
they are deliberately tolerant: fields that older documents lack are optional
everywhere, and nothing assumes the newer shape.

### `users`

```ts
type UserDocument = {
  _id: ObjectId;
  name: string;
  email: string;            // stored as typed; matched case-insensitively
  password?: string;        // bcrypt hash. Absent or "" for Google-only accounts
  isAdmin?: boolean;
  isGoogleLogin?: boolean;
  googleId?: string;
  phone?: string;
  address?: string;
  city?: string;            // "suburb" to the customer
  zipcode?: string;         // "postcode" to the customer
  resetToken?: string;      // SHA-256 of the emailed token, never the token
  tokenExpiration?: Date;
  orders?: ObjectId[];
};
```

### `orders`

```ts
type OrderDocument = {
  _id: ObjectId;
  user: ObjectId;
  items: OrderItemDocument[];
  amount: number;           // DOLLARS in storage, cents everywhere in code
  address: string; city: string; zipcode: string;
  phone: string; email: string; name: string;
  paymentMethod: string;
  pickup?: boolean;
  status?: string;
  hidden?: boolean;         // excluded from lists and totals, never deleted
  hiddenAt?: Date;
  paymentIntentId?: string; // links an order to its payment
  paidAt?: Date;
  createdAt?: Date; updatedAt?: Date;
};

type OrderItemDocument = {
  name: string; price: number; quantity: number;   // always present
  image?: string; urgId?: string; invNumber?: string;
  stockNo?: string; tag?: string;
  manufacturer?: string; model?: string; year?: number | string;
  itemTypeCode?: string; productUrl?: string;      // newer orders only
};
```

**Money.** Stored in dollars because the existing data is in dollars. Converted
to integer cents at the boundary (`Math.round(amount * 100)`) and handled as
cents everywhere above it. Never do arithmetic on the dollar floats.

**Statuses.** Four, in the order an order moves through them:

```ts
const ORDER_STATUSES = ["Pending", "Processing", "On Their Way", "Delivered"] as const;
const NEEDS_ACTION = ["Pending", "Processing"];
```

Renaming one orphans every order already carrying the old word. Match whatever
the existing data uses, exactly, before inventing better names.

---

## 4. The database connection

`src/lib/db/mongo.ts`

One client for the process, cached on `globalThis` so a hot reload in
development does not open a new pool on every save. This is the pattern MongoDB
documents for exactly this reason.

```ts
declare global { var __appMongo: Promise<MongoClient> | undefined; }

function connect(): Promise<MongoClient> {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI is not set.");
  return new MongoClient(uri, { serverSelectionTimeoutMS: 8_000 }).connect();
}

export function client() {
  globalThis.__appMongo ??= connect();
  return globalThis.__appMongo;
}
export async function users()  { return (await client()).db().collection<UserDocument>("users"); }
export async function orders() { return (await client()).db().collection<OrderDocument>("orders"); }
export function isConfigured() { return Boolean(process.env.MONGO_URI); }
```

`isConfigured()` matters: pages call it and say "accounts are not available"
rather than throwing a stack trace when a deployment is missing the variable.
That is what a misconfigured deploy should look like.

Every file that touches the database starts with `import "server-only"`. If a
client component ever imports one, the build fails instead of shipping the
driver to the browser.

---

## 5. Sessions

`src/lib/auth/session.ts`

**A signed token in an httpOnly cookie. Not localStorage.** The site this
replaced kept a JWT in localStorage, where any script on the page can read it:
one injected script and an attacker has that customer's session for the seven
days it lasts. A cookie the browser will not hand to JavaScript cannot be taken
that way, and it is attached automatically so nothing has to remember to send it.

```ts
const COOKIE = "app_session";
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export async function createSession(userId: string) {
  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secret());

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",     // so a link from an email or a payment redirect still arrives signed in
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function readSession(): Promise<{ userId: string } | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.userId === "string" ? { userId: payload.userId } : null;
  } catch {
    return null;   // expired, tampered with, or signed with a since-changed secret
  }
}
```

**The token carries the user id and nothing else.** Whether somebody is an admin
is read from the database on every request. Putting `isAdmin` in the token means
revoking admin does nothing until that person's week-old token expires.

---

## 6. Accounts

`src/lib/auth/accounts.ts`

```ts
type Account = {
  id: string; name: string; email: string; isAdmin: boolean;
  phone: string; address: string; city: string; zipcode: string;
};
```

`toAccount()` maps a document to this and is the only place `_id.toString()`
happens. Pages never see a document.

### Password verification

```ts
export async function verifyCredentials(email: string, password: string) {
  const user = await (await users()).findOne(emailQuery(email));
  if (!user?.password) return null;     // Google-only account: no password to match
  return (await bcrypt.compare(password, user.password)) ? toAccount(user) : null;
}
```

Two things that matter:

1. **A missing hash must fail, not throw and not pass.** In this dataset 35 of
   62 accounts were created through Google and have `password: ""`. A careless
   comparison against an empty hash is a way into a third of the accounts.
2. **Returns null either way.** The caller must not say which half was wrong.
   "No account with that email" is a way to enumerate customers one guess at a
   time.

Email matching is case-insensitive via an anchored, escaped regex:

```ts
function emailQuery(email: string) {
  return { email: { $regex: `^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } };
}
```

Escape the input. An unescaped regex from a form is a denial-of-service at best.

### The signed-in account

```ts
export async function currentAccount(): Promise<Account | null> {
  const session = await readSession();
  if (!session) return null;
  let id: ObjectId;
  try { id = new ObjectId(session.userId); } catch { return null; }
  const user = await (await users()).findOne({ _id: id });
  return user ? toAccount(user) : null;
}

export async function requireAdmin() {
  const account = await currentAccount();
  return account?.isAdmin ? account : null;
}
```

### Other functions

- `createAccount({ name, email, password })` — hashes at cost 10, `isAdmin: false`
- `updateDetails(userId, { name, phone, address, city, zipcode })`
- `changePassword(userId, password)` — also `$unset` the reset token and expiry
- `listAccounts(limit)` — for counting
- `searchAccounts({ search, page, perPage })` — paged, matches name, email, phone
- `setAdmin(userId, isAdmin)`
- `countAdmins()` — used to protect the last admin
- `deleteAccount(userId)` — removes the account, **leaves their orders**

Deleting a customer must not delete their sales. An order records money that
changed hands and carries its own copy of the name, email and address.

---

## 7. Google sign-in

`src/lib/auth/google.ts` and `src/components/auth/GoogleSignIn.tsx`

Most customers on this kind of site are Google customers. An email-and-password
form on its own locks out everybody whose account has no password.

**The button is Google's, not ours.** Their script renders it so the account
chooser, the branding and the consent behaviour are the ones people recognise,
and it keeps working when Google changes them.

```tsx
window.google.accounts.id.initialize({ client_id, callback: handleCredential });
window.google.accounts.id.renderButton(element, {
  theme: "filled_black", size: "large", shape: "pill", text: "continue_with", width: 320,
});
```

The callback receives `response.credential`, an ID token, and sends it to a
server action. **Verify it before believing a word of it:**

```ts
const ticket = await client.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID });
const payload = ticket.getPayload();
const email = payload?.email?.trim().toLowerCase();
if (!email || payload?.email_verified === false) return null;
```

`audience` rejects a token minted for a different application. `email_verified`
matters because an unverified address is not proof of anything: without that
check somebody can claim another person's account by signing up with their
address.

**Account matching is on email.** Somebody who registered with a password and
later uses Google lands on the same account, and their password still works.
On first Google use, record `googleId` on the existing document.

New Google accounts are created with `password: ""` and `isGoogleLogin: true`,
matching what the existing application produced.

---

## 8. Password reset

`src/lib/auth/reset.ts`

```ts
const token = randomBytes(32).toString("hex");   // the only copy, goes in the email
await users.updateOne({ _id }, { $set: {
  resetToken: createHash("sha256").update(token).digest("hex"),
  tokenExpiration: new Date(Date.now() + 60 * 60 * 1000),
}});
```

**Store the hash, never the token.** Same reason passwords are hashed: a leaked
database should not hand somebody a working reset link for every account in it.

Completing a reset matches the hash *and* the expiry together, so an old link
fails exactly as an invented one does. `changePassword` clears both fields, so a
link works once.

`isResetTokenValid(token)` is checked when the page renders, so somebody
following a stale link is told immediately rather than typing a new password
twice and only then finding out.

**The request form always answers the same way**, whether or not the address has
an account:

> If that address has an account, a reset link is on its way. It is good for one hour.

---

## 9. Rate limiting

Fixed window, in memory, keyed per identity:

| Action | Limit |
| --- | --- |
| sign in | 10 per hour per email |
| register | 5 per hour per email |
| reset request | 5 per hour per email |

In-memory is honest about its limits: it resets on deploy and does not span
instances. For one server it is enough, and it is the difference between a
password being guessable at network speed and not. Move it to Redis when there
is more than one instance.

---

## 10. Server actions

All actions are `"use server"`, take `(previousState, formData)` so they work
with `useActionState`, and return a plain object. **Every admin action re-checks
`requireAdmin()` itself.** Hiding a button is not access control: a form can be
submitted by anyone who knows the address.

### `src/app/actions/auth.ts`

| Action | Returns | Notes |
| --- | --- | --- |
| `signIn` | `{ errors?, message? }` | redirects to `next` on success; `next` must start with `/` and not `//` |
| `register` | `{ errors?, message? }` | existing email answers with advice, not "taken" |
| `signOut` | — | clears the cookie, redirects home |
| `signInWithGoogle(idToken)` | `{ message? }` | not a form action; called from the button |
| `requestPasswordReset` | `{ errors?, message?, done? }` | identical answer either way |
| `resetPassword` | `{ errors?, message?, done? }` | checks the two password fields match |

The `next` parameter is validated:

```ts
function safeDestination(value: string) {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/my-account";
}
```

Without that, `?next=https://evil.example` turns your sign-in page into an open
redirect.

### `src/app/actions/account.ts`

`saveDetails` — validates with Zod, writes to **the account in the session**.
Never take a user id from the form: an id in a form is an id somebody can edit,
and editing it lets one customer rewrite another's details.

### `src/app/actions/admin.ts`

| Action | Guards |
| --- | --- |
| `updateOrderStatus` | admin; status must be one of the four |
| `toggleOrderHidden` | admin |
| `updateUserAdmin` | admin; cannot remove your own; cannot remove the last admin |
| `deleteUser` | admin; cannot delete yourself |
| `sendResetLink` | admin; sends to the customer's own inbox |

Ids are validated as `/^[a-f\d]{24}$/i` before reaching `new ObjectId()`, which
throws on anything else.

**An admin never types another person's password.** The reset link goes to the
customer's inbox. An admin who can set a password for an account can then sign
in as it, and the audit trail shows the customer, not the admin.

All actions call `revalidatePath()` for the pages they change.

---

## 11. The order repository

`src/lib/orders/repository.ts`

| Function | Purpose |
| --- | --- |
| `listForUser(userId)` | one customer's orders, newest first |
| `listOrders({ search, status, sort, page, perPage })` | the admin list, paged |
| `countByStatus()` | the numbers on the filter chips, including Hidden |
| `getOrder(id)` / `setStatus` / `setHidden` | single order operations |
| `summarise()` | everything the dashboard shows, in one pass |

**Hidden orders** are excluded unless `status === "Hidden"` is what was asked
for. Hiding is not deleting: nothing in this repository deletes an order.

**Search** covers what somebody has to hand when a customer rings: part name,
customer name, email, phone, address, suburb, stock number, make, model, and a
complete order id.

`summarise()` reads the orders and counts in memory rather than running six
aggregations, because thirty-five orders is nothing. It returns:

```ts
type OrderSummary = {
  todayCount; todayRevenueCents; totalCount; averageOrderCents;
  needsAction; delivered; revenueCents;
  countByStatus: Record<string, number>;
  revenueByStatusCents: Record<string, number>;
  monthlyRevenueCents: number[];          // 12 entries, January first
  perDay: { date: string; count: number }[];   // last 30 days, oldest first
};
```

At fifty thousand orders, move this into an aggregation pipeline. **The returned
shape does not have to change**, which is the point of it being one function.

---

## 12. The design pattern

### Surfaces

| Token | Value | Used for |
| --- | --- | --- |
| `canvas` | `#000000` | the header, and behind everything |
| `admin` | `#050505` | page background |
| `card` | `#0f0f10` | cards, panels, table shells, menus |
| `surface-raised` | `#2b2b2b` | a panel on a panel |
| input background | `#0b0b0d` | text inputs and selects |
| `line` | `#232327` | every border and divider |

### Colour

One brand colour, meaning "act": buttons, the active tab, badges. Define three
tokens: `brand`, `brand-hover` (about 10% darker), and `brand-text`, a lighter
tint used for **red text**, because a saturated brand red rarely passes contrast
on black at body size.

Never a raw Tailwind palette colour (`red-500`) or a hex literal in a component.

Status colours live in one file and are used by the charts, the chips and the
tables alike, so a status is never amber in one place and green in another:

```ts
export const STATUS_COLOURS = {
  Pending: "#f5a524", Processing: "#3b82f6",
  "On Their Way": "#e9162f", Delivered: "#22c55e",
};
```

Text: white for headings and figures, `gray-300` body, `gray-400` secondary,
`gray-500` labels and hints. Nothing dimmer than `gray-500` on these surfaces.

### Shape

- Cards `rounded-2xl`, `border border-line`, `bg-card`, no shadow
- Floating things (menus, the sign-in panel) get `shadow-2xl`
- Inputs and panel buttons `rounded-xl`; chips `rounded-full`; controls inside a
  table row `rounded-lg`
- Focus turns the input border to the brand colour

### Type

| Role | Class |
| --- | --- |
| Page heading | `text-2xl md:text-3xl font-extrabold tracking-tight` |
| Section heading | `text-lg font-bold` |
| Card label | `text-[11px] font-semibold tracking-[0.18em] uppercase text-gray-500` |
| Figure | `text-2xl font-extrabold tabular-nums` |
| Body | `text-sm` |
| Hint | `text-xs text-gray-500` |

**`tabular-nums` on every number that can change.** Without it, columns of money
jitter as they update.

### Layout

- Frame: `max-w-[1600px]`, sidebar `w-72` (288px), content `flex-1 min-w-0`
- `min-w-0` on the content column is not optional: without it a wide table
  refuses to shrink and pushes the sidebar off screen
- Padding: `p-6 lg:p-10` around content, `p-5 md:p-6` inside a card
- Grids: `gap-4` between cards, stat rows `grid-cols-2 xl:grid-cols-4`

### Responsive

| Size | Width | Behaviour |
| --- | --- | --- |
| Mobile | 375-767 | sidebar becomes a top strip; stats two across; tables scroll inside their own container |
| Tablet | 768-1023 | filters inline; two-column content where it helps |
| Laptop | 1024-1535 | sidebar beside content; full table layout |
| Ultrawide | 1536+ | stats four across; content capped at 1600px, background continues |

Nothing is full-bleed except backgrounds. A table scrolls rather than crushing
its columns.

---

## 13. The components

### `AccountShell`

Wraps every one of the six pages. Props: `account`, `active` (the current href),
`title`, optional `action`, and children.

Renders: the sidebar with "Signed in as" and the person's name, the tab list,
Sign out as a form posting to the `signOut` action, and a content column with an
`h1`.

**The tab list is filtered, not disabled:**

```ts
const items = ALL_ITEMS.filter((item) => account.isAdmin || !item.adminOnly);
```

A customer sees My Profile and My Orders. An admin sees those plus Dashboard,
Manage Orders and Manage Users. Same frame, same shape, nothing offered that
would only refuse them.

### `StatCard`

`label`, `value`, optional `hint`, and `tone` of `plain | brand | warn | good`.
Four across the top of most pages. Tone is the only colour decision the caller
makes.

### Charts

Four charts, **hand-drawn as SVG in server components**. No charting library:
four small charts of thirty-five orders do not justify shipping ~180KB of
JavaScript to draw them, and server-rendered they are in the first paint.

| Component | Shows |
| --- | --- |
| `RevenueLine` | twelve months, filled area under a line |
| `RevenueByStatus` | labelled horizontal bars |
| `StatusRing` | a donut with the total in the hole, legend beside it |
| `DailyBars` | the last thirty days |

A ring rather than a pie because the hole is where the number goes, and reading
a number beats judging the angle of a slice. Each takes its colours from the
shared status map.

`ChartCard` is the frame: a title, an optional action on the right, and the
chart. Use it for the recent-orders table too, so everything on the page is the
same object.

### `OrderRow` (client)

A closed row and an open one.

Closed: part name (with "+N more"), the vehicle underneath, a short order id
(`…794286`, full id in the `title`), date, total, status in its colour, and a
status `<select>`.

The select **submits on change**. An admin working through a morning's orders
should not press save after every one.

Open: every item with its image and full detail (name, manufacturer, model,
year, type code, tag, inv number, stock number, quantity, price), the customer's
details, and the hide control with a sentence saying what hiding does:

> Hiding removes this order from the list and from all totals. It is not deleted.

### `UserRow` (client)

Name, email, phone, role, and one **Actions** menu holding all three operations:
make/revoke admin, send password reset, delete account.

The menu closes on outside click and on Escape. Delete asks first: the button
becomes "Yes, delete this account". It is the one irreversible action here.

### Forms

`AuthForms` holds sign-in and registration, switching between them in local
state, with the Google button above a divider reading "or with your email".
Google goes first because most accounts are Google accounts.

`ResetForms` exports the two reset forms. Both use `useActionState` and a
`useFormStatus` submit button that says "Please wait..." while pending.

---

## 14. The header

The header needs to know who is signed in, and it is on every page.

**Do not read the session in the root layout.** Calling `cookies()` there makes
every page on the site dynamic, so static pages stop being static for the sake
of one menu. Instead, expose an endpoint and have the header ask after it loads:

```ts
// GET /api/session
export async function GET() {
  const account = await currentAccount();
  return Response.json(
    account ? { signedIn: true, name: account.name, isAdmin: account.isAdmin }
            : { signedIn: false },
    { headers: { "cache-control": "no-store, private" } },
  );
}
```

`no-store, private` is not decoration. Without it a shared cache can hand one
person's session summary to the next visitor.

Signed in, the menu shows the name, Dashboard (admins only), My profile, My
orders and Sign out, with a small dot on the icon. Without that dot the icon
looks identical signed in or out, which is how a menu ends up saying "Login"
forever.

---

## 15. Behaviour worth keeping

1. **Hide, never delete, an order.** A record of money taken should not be
   destroyable from a web page. Hidden orders leave the list and every total and
   stay in the database.
2. **An admin cannot remove their own admin rights, and the last admin cannot be
   removed.** One careless click otherwise leaves a back office nobody can open.
3. **Deleting a customer leaves their orders.**
4. **Money is integer cents on the server**, converted once at the boundary.
5. **Nothing trusts a price, a total or a user id from a form.**
6. **Pages that read configuration must be `dynamic = "force-dynamic"`.** A page
   that checks an environment variable and gets prerendered bakes the answer
   from build time into static HTML, and setting the variable afterwards changes
   nothing. This happened to the sign-in page: it served "accounts are not
   available" from a build made before the database was configured.

---

## 16. Accessibility

Not extras; they are part of "done".

- Every interactive element has a visible focus state
- Every icon-only button has an `aria-label`
- Menus and dropdowns carry `aria-expanded` and `aria-haspopup`, close on
  Escape and on outside click
- The current tab carries `aria-current="page"`
- Status messages use `role="status"`, errors `role="alert"`
- Inputs are tied to labels by `htmlFor`/`id`, errors by `aria-describedby`, and
  invalid fields carry `aria-invalid`
- Body text at 4.5:1 contrast, large text at 3:1. On black this is why red text
  uses the lighter tint

---

## 17. What to change for a different site

1. **Brand tokens** — the three brand colours. Everything else is neutral.
2. **Statuses** — match whatever the existing orders contain, exactly.
3. **Collection names** — `users` and `orders` here.
4. **The item fields** in the order detail panel: this site shows stock number,
   tag and inv number because a yard picks parts off a shelf by them. Show
   whatever your pickers use.
5. **Sidebar tabs** — the shape holds; the labels are yours.
6. **The stat cards** — four figures somebody opens the page to see. Ours are
   today's orders, today's revenue, total orders, average order value.
7. **Google sign-in** is worth keeping only where accounts already use it.

---

## 18. Build order

Each step leaves something that works.

1. `mongo.ts` with the document types and `isConfigured()`
2. `session.ts`, then `accounts.ts` with `verifyCredentials` and `currentAccount`
3. `credentials.ts` (Zod schemas), then the `signIn` / `register` / `signOut` actions
4. `/login` with the email form. **Check `dynamic = "force-dynamic"`.**
5. `AccountShell` and `StatCard`
6. `/my-account` and `/orders`
7. `guard.ts`, then `/dashboard` with stat cards only
8. `Charts.tsx`, then the four charts
9. The order repository's `listOrders`, `countByStatus`, then `/manage-orders`
10. `OrderRow` with expansion, status change and hiding
11. `searchAccounts`, `/manage-users`, `UserRow`, the admin actions
12. `/api/session` and the header menu
13. Google sign-in
14. Password reset
15. The responsive pass at 375, 768, 1440 and 2560

**Verify each page by rendering it, not by the build passing.** A page can keep
serving an old file while the build stays green: two pages here were rewritten
by a shell command that failed halfway, and because the old files were still
valid TypeScript nothing complained until somebody looked at the screen.

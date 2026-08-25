# The design pattern

Taken from the dashboard, which the owner approved as the direction, and applied
to every page from here on. Anything that disagrees with this document is a bug
in the page, not a variation.

## The idea in one line

Dark, quiet surfaces; one red used sparingly and always meaning "act"; content
in bordered cards that sit on the background rather than blending into it.

## Colour

Four surfaces, darkest at the back:

| Token | Value | Used for |
| --- | --- | --- |
| `canvas` | `#000000` | the page behind everything, and the header |
| `admin` | `#050505` | page backgrounds for content areas |
| `card` | `#0f0f10` | cards, panels, table shells, menus |
| `tile` / `surface-raised` | `#1a1a1a` / `#2b2b2b` | a card on a card, inputs on a panel |
| `line` | `#232327` | every border and divider |

Text: white for headings and figures, `gray-300` for body, `gray-400` for
secondary, `gray-500` for labels and hints. Nothing below `gray-500` on a dark
surface, because it stops being readable.

One red, and it means action:

- `brand` `#e9162f` for buttons, the active nav item, the cart badge
- `brand-hover` `#d11428`
- `brand-text` `#f06172` for red **text**, which passes contrast on black where
  the brand red does not

Never Tailwind's `red-500`, `red-600` or a hex literal in a component. Status
colours live in `src/lib/orders/status.ts` and nowhere else.

## Shape and depth

- Cards: `rounded-2xl`, `border border-line`, `bg-card`. No shadow by default;
  a shadow only where something floats (menus, the sign-in panel).
- Controls: `rounded-xl` for inputs and buttons in panels, `rounded-full` for
  chips and pill buttons, `rounded-lg` for small controls inside table rows.
- Inputs: `bg-[#0b0b0d]`, `border-line`, focus turns the border brand red.

## Type

Arial, as the site has always used. The scale, which is all that changes:

| Role | Class |
| --- | --- |
| Page heading | `text-2xl md:text-3xl font-extrabold tracking-tight` |
| Section heading | `text-lg font-bold` |
| Card label | `text-[11px] font-semibold tracking-[0.18em] uppercase text-gray-500` |
| Figure | `text-2xl font-extrabold tabular-nums` |
| Body | `text-sm` (`md:text-base` where it is prose) |
| Hint | `text-xs text-gray-500` |

Every number that can change (money, counts, dates) gets `tabular-nums`, so
columns do not jitter as they update.

## Width and rhythm

- One width for the whole site: `Container`, which is `max-w-[1600px] px-6
  lg:px-10`. The header, the footer, every page and the admin all use it, so
  everything lines up down the page and a large screen has something to use
  rather than a narrow column marooned in the middle.
- Long-form reading is the exception: `<Container width="prose">` caps an
  article at `max-w-3xl`, because a line past about eighty characters is harder
  to follow. It is a prop rather than a class passed through `className`, which
  collides with the width already on the element and wins or loses depending on
  the order Tailwind emits them.
- Ultrawide: nothing is full-bleed except backgrounds. On a 3440px screen the
  content stops and the background continues.
- Vertical rhythm: `py-14 md:py-20` between page sections, `gap-4` between cards
  in a grid, `p-5 md:p-6` inside a card.
- No `min-h-screen` on a page whose content is short. That is what left a gulf of
  black above the footer on the sign-in page.

## Breakpoints

Designed at four sizes, in this order:

| Name | Width | What changes |
| --- | --- | --- |
| Mobile | 375-767 | one column, sidebar becomes a top strip, tables scroll |
| iPad | 768-1023 | two columns where it helps, filters go inline |
| Laptop | 1024-1535 | the full layout, sidebar beside content |
| Ultrawide | 1536+ | four-across stat rows, content capped, never stretched |

A table never gets narrower than it can read: it scrolls inside its own
container rather than crushing its columns.

## Components that already carry the pattern

Copy these rather than inventing a variant:

- `AccountShell` and `StatCard` in `src/components/account/AccountShell.tsx`
- `ChartCard` in `src/components/admin/Charts.tsx`
- The filter chips in `src/app/manage-orders/page.tsx`
- The table shell in `src/app/manage-users/page.tsx`

## Rules that are not negotiable

1. Every interactive element has a visible focus state.
2. Nothing under 4.5:1 contrast for body text, 3:1 for large text.
3. Buttons say what they do: "Hide payment", not "OK".
4. Destructive actions confirm, and say what will and will not be destroyed.
5. Logic and wording of existing buttons stay as they are. This is a re-skin,
   not a change of behaviour.

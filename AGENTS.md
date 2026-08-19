<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Central Coast Auto Parts — Next.js rebuild

A rebuild of the live CCAP site (React 18 + Vite SPA, plus an Express/Mongo API)
as one Next.js application. The reference implementation is at
`../boya1-main`. It is the **behavioural** spec, not code to copy.

**This does not go to production until the owner has reviewed and approved it.**
Do not deploy, do not touch the live server, do not push to the live repo.

## Non-negotiables

1. **No SEO may be lost.** Every public URL on the current site keeps its exact
   path. Titles, descriptions, canonicals, Open Graph tags and structured data
   are carried across verbatim unless a change is explicitly agreed. Do not
   enable `trailingSlash` — it rewrites every route.
2. **The design matches the current site exactly.** Anything that looks broken
   gets recorded in `docs/DESIGN-NOTES.md` for a decision, not silently fixed.
   Verify against *computed styles on the live site*, not the old stylesheets —
   they disagree, and the stylesheets are wrong.
3. **Behaviour is preserved; implementation is not.** The backend is being
   rewritten properly. What it *does* stays the same; how it does it should get
   markedly better.
4. **Security is a first-class requirement,** not a later pass. No secrets in
   client bundles, no trusting client-supplied prices, every mutation
   authenticated and authorised.

## Code standards

- **TypeScript everywhere**, no `any` without a comment justifying it.
- **Server Components by default.** Add `"use client"` only where interactivity
  genuinely requires it, and push it as far down the tree as possible.
- **Comments explain *why*, never *what*.** The reader can see what the code
  does. Record the reason, the constraint, or the bug being prevented. Every
  non-obvious decision in the old codebase was lost because nobody wrote this
  down.
- **Name tokens, not values.** No hex literals in components — use the tokens in
  `globals.css`. The old codebase repeated one red 212 times.
- **Money is integer cents**, computed server-side, never taken from the client.
- **Pure functions for anything with rules** — pricing, shipping, filtering — so
  they can be reasoned about and checked in isolation.
- Prefer clarity over cleverness. Short is not the goal; obvious is.

## Layout

```
src/app/        routes, layouts, route handlers
src/components/ shared UI
src/lib/        domain logic, data access, integrations
docs/           decisions and findings for the owner
```

## Verifying

`npm run dev` then compare against the live site. `npm run build` must pass and
`npm run lint` must be clean before anything is committed.

**Check what is painted, not just what is in the HTML.** Content and metadata
can be correct while the page still looks wrong. Read back computed styles —
backgrounds, colours, sizes — and compare them against the live site.

**Restart the dev server after adding a file that introduces new utility
classes.** Tailwind v4 does not always pick up a newly created source file, and
serves a stale stylesheet instead: the markup is right, the classes are on the
elements, and they paint as transparent. A clean `npm run build` shows the
truth. This has already caused one "where is the design" moment; if styles look
missing, rebuild before debugging anything else.

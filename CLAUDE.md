# CLAUDE.md

## Working with Nick (owner)
- Keep responses brief.
- Give instructions one step at a time unless asked otherwise.

## Repo layout
The Next.js app lives in `stt-nextjs/`, **not** the repo root. All app files go inside `stt-nextjs/`.

```
stt-nextjs/
  app/            # App Router pages (/, audience, campaigns, merch, opportunities, platforms, voice, login)
    api/          # login, logout, export/*, sync/*
    globals.css   # all styles, incl. responsive media queries
  components/     # Shell.jsx (layout + DASHBOARD_VERSION), UI primitives
    views/        # one component per dashboard view
  lib/            # data.js (builds STT data shape), db.js (pg pool), auth.js, csv.js, insights.js
  middleware.js   # auth gate
  public/, fonts/
```
Stray `app/` and `components/` at the repo root are not part of the app — don't add to them.

## Two repos, one database
- **stt-dashboard-next** (this repo): the dashboard. Fixes to how data is **displayed** go here.
- **stt-social-listening**: owns the `/api/sync/*` data-pull endpoints. Fixes to how data is **pulled** go there.
- Both share one Neon Postgres database.
- In this repo, `app/api/sync/[source]` is a proxy that forwards requests to stt-social-listening's live endpoints. `app/api/sync/translate` and `app/api/sync/ai-summary` are local routes that run here.

## Schema changes
- Written as numbered SQL migration files in `stt-social-listening/db/`.
- Run by hand in the Neon SQL editor. **Never assume a migration has been run.**

## Data contract (`lib/data.js`)
Builds the `STT` data shape the views read (server-side equivalent of the design handoff's `window.STT`), sourced from Neon.
- `sentiment_tag` stores multiple tags as one comma-joined string — split on `,` where views want `tags: string[]`.
- `manual_tag` overrides `sentiment_tag` when set.
- Rows with `excluded = true` are dropped from every view.
- Analytics tables are upsert-on-write (one current row per source/report_type/metric/dimensions), so plain SELECTs are already deduped — no "filter to one Date Pulled" needed.
- Untagged comments get a synthetic `Unreviewed` tag (`tagsForComment`).
- Unbuilt fields are marked `// TODO(<view>)`; fill in, don't reshape.

## Versioning
Bump `DASHBOARD_VERSION` in `stt-nextjs/components/Shell.jsx` with **every** change:
- PATCH: bug fixes
- MINOR: features
- MAJOR: deployment/usage changes

## Responsive layout
- Use CSS media queries in `globals.css`, not JS width hooks.
- Breakpoints: 760px (content, `max-width: 759px`), 860px (sidebar, `max-width: 859px`).
- `Button.jsx` sets an inline `display` style, so hiding it via CSS needs `!important`.

## Secrets & env
- Never commit secrets. Env vars are managed in Vercel.

## Before pushing
Run `npm run build` inside `stt-nextjs/` to confirm it compiles.

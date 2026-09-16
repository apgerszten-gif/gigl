# Gigl

A Letterboxd-style app for live music. People log shows they've been to (a festival set or a gig found through search), rate them, and rank them. Mobile-first and built for one-handed use.

## Stack

- Next.js 14.2 (App Router), React 18, TypeScript, Tailwind CSS 3.4
- Supabase (Postgres + auth). `supabase-schema.sql` is append-only: new DDL goes at the end and is run by hand in the Supabase SQL editor.
- Ticketmaster Discovery API (show catalogue), Twilio (SMS)
- Vercel project `gigl-app`: production deploys from `main` and is served at gigl-review.vercel.app. The separate Vercel project `gigl` is a broken duplicate on the same repo; its failing checks can be ignored.

## Commands

- `npm run dev`, `npm run build`
- `npx tsc --noEmit` to type-check (there is no test suite or lint script)

## Things that have bitten us

- **Next 14 caches `fetch` indefinitely, including supabase-js requests.** A GET route handler that reads Supabase needs `export const fetchCache = 'default-no-store'` (see `app/api/shows/search/route.ts`), or it keeps serving its first result forever.
- Show search reads the `shows` table, which `/api/cron/sync-shows` refills nightly at 09:00 UTC. That route needs `CRON_SECRET` and `SUPABASE_SERVICE_ROLE_KEY`.
- **Ratings are stars out of 5.** Each log has three 1–5 star sub-ratings (performance, venue, crowd). `lib/rating.ts` averages them into the show score. Never display or store ratings on a 10-point scale.

## Design system

`DESIGN.md` is the source of truth for Gigl's visual language, **Warm Riso Zine**: paper and cream surfaces, dark-brown ink, a burnt-sienna accent, 1.5px ink borders with hard offset shadows, and Space Grotesk + Inter. **Read `DESIGN.md` before creating or changing any UI.** `/design` (`app/design/DesignPreview.tsx`) renders every pattern with sample data. It only exists in local dev and preview deployments.

How to apply it:

- **Build UI from the shared pieces, not raw classes:**
  - `components/ui.tsx`: `Card`, `Label`, `Chip`, `Stars`, `ArtistPhoto`, `PersonPhoto`, `Place`, `DateTag`, `Segmented`, `BackHeader`, the `btn*` recipes and more
  - `components/AppHeader.tsx` for the main tabs' header, `components/BottomNav.tsx` for the dock, and `components/Logo.tsx`
  - `DESIGN.md` section 4 maps each pattern to its component.
- When you need raw classes, use the Tailwind tokens:
  - colours: `paper`, `cream`, `cream-alt`, `ink`, `ink-muted`, `ink-faint`, `accent`, `accent-hover`, `terra`, `star`
  - `font-display` / `font-sans`, `border-1.5`, `rounded-card`, `shadow-riso` / `shadow-riso-lg`, `tracking-label`
  - Use opacity modifiers for tints (`bg-accent/10`, `border-ink/15`) rather than new hex values.
  - **Don't pass a conflicting class to a component that already sets it** (for example a text colour to `Label`, or a font size to `Logo`). Tailwind doesn't let the later class win reliably. Use the component's prop instead (`tone`, `size`), or add one.
- Icons come from `lucide-react`.
- **A rating is only ever shown as stars.** Use `Stars` (it wraps `components/StarDisplay.tsx`, which handles partial fills). Don't add numeric scores or tier descriptors (Elite, Epic, Top Tier…). The unlinked legacy `/rank` page still shows Elo numbers.
- Gigl stores no artist or profile photos yet, so `ArtistPhoto` and `PersonPhoto` fall back to placeholders (see *(needs data)* in `DESIGN.md`). Ask before adding image columns, storage or uploads.
- Features marked *(mockup)* in `DESIGN.md` exist only in the style guide: Popular tab, filter chips, gig map, streaks, goals, milestone callouts, city rank and adding your own show. Don't build them without asking. Reviews, highlight tags, friend tagging, photos and the following filter are real.
- **Festival theming is not carried forward.** Ignore festival-specific screens and themes (Bonnaroo, Outside Lands) when designing. No screen uses `useTheme()` / `lib/theme.ts` any more; `FestivalThemeProvider` in `app/layout.tsx` and the unused `components/SmsScoringSection.tsx` are the only things left touching them.

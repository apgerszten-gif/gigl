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
- **Scores are out of 5.** Each log has three 1–5 star sub-ratings (performance, venue, crowd). `lib/rating.ts` averages them into the show score. Never display or store scores on a 10-point scale.

## Design system

`DESIGN.md` is the source of truth for Gigl's visual language: warm parchment surfaces, a terracotta accent, green score badges and the Epilogue font. **Read `DESIGN.md` before creating or changing any UI.**

How to apply it:

- Style with the Tailwind tokens in `tailwind.config.js`:
  - surfaces: `bg-surface`, `bg-surface-container-lowest|low|high|highest`
  - accent: `bg-primary`, `hover:bg-primary-hover`, `bg-primary-light`
  - text: `text-ink-title|body|muted|faint`
  - scores: `score-elite|epic|superb|good`
  - `shadow-warm-sm|md|lg`, `rounded-squircle`, `font-epilogue`
- The HTML in `DESIGN.md` is a visual reference, not code to paste. Where it uses arbitrary values (`bg-[#FFF8F5]`, `font-['Epilogue',sans-serif]`) or a default Tailwind colour for something a token covers, use the token. Tailwind's `stone` scale is fine for neutral borders, dividers and fills, as the templates use it.
- Score badges use the `score-*` tokens rather than the templates' `emerald-*` classes. They show the real out-of-5 score (see above), not the mockups' 10-point numbers. Which score maps to which tier colour hasn't been decided yet, so ask before hard-coding thresholds.
- The mockups show features Gigl doesn't have yet: the Popular Gigs tab, filter chips, Want to See, Gig Map, streaks, goals, Buddies, city rank, verified badges, field notes, highlight/vibe tags and setlists. They also use sample data. Don't build those features or ship that data without asking. The following filter, friend tagging and photos do already exist.

### Migration status

The app is partway between the old and new look:

- Most screens are still styled with inline `style={{}}` objects from `useTheme()` (`components/FestivalThemeProvider.tsx`, `lib/theme.ts`). That is the older "Warm Riso Zine" look, set in Space Grotesk and Inter. When you rework a screen, move it to the Tailwind tokens instead of adding more theme-object styling.
- The legacy Tailwind colours (`paper`, `cream`, bare `ink`, `sienna`, `terra`, `taupe`, `faint`) and the `display` / `sans` fonts stay only until migration is finished. Don't use them in new code.
- `components/BottomNav.tsx` isn't used anywhere, and it references a `brand` colour that doesn't exist.

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

- Style with the Tailwind tokens and the class recipes in `DESIGN.md`:
  - colours: `paper`, `cream`, `cream-alt`, `ink`, `ink-muted`, `ink-faint`, `accent`, `accent-hover`, `terra`, `star`
  - `font-display` / `font-sans`, `border-1.5`, `rounded-card`, `shadow-riso` / `shadow-riso-lg`, `tracking-label`
  - Use opacity modifiers for tints (`bg-accent/10`, `border-ink/15`) rather than new hex values.
- The logo is `components/Logo.tsx`: "Gigl" with a capital G and a sienna slash.
- Icons come from `lucide-react`.
- **A rating is only ever shown as stars.** Use `components/StarDisplay.tsx`, which handles partial fills. Inside a `text-star` element, pass `accent="currentColor"`. Don't add numeric scores or tier descriptors (Elite, Epic, Top Tier…).
- Several features in the design exist only as mockups and are marked *(mockup)* in `DESIGN.md`: Popular tab, filter chips, Want to see, Gig map, streaks, goals, buddies, city rank, field notes, highlight tags and setlists. Don't build them without asking. The following filter, friend tagging and photos do already exist.

### Migration status

- Most screens are still styled with inline `style={{}}` objects from `useTheme()` (`components/FestivalThemeProvider.tsx`, `lib/theme.ts`). The token values match `DEFAULT_THEME`, so moving a screen to Tailwind is mostly mechanical. When you rework a screen, move it to the tokens instead of adding more theme-object styling. Many of those screens also inline their own copy of the logo.
- Festival theming is not carried forward. `useTheme()` swaps the accent per festival (Bonnaroo is amber), but migrated screens use the fixed tokens. Ignore festival-specific screens and themes (Bonnaroo, Outside Lands) when designing or migrating.
- `components/BottomNav.tsx` isn't used anywhere, and it references a `brand` colour that doesn't exist.

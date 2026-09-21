# Gigl Design System: Warm Riso Zine

Gigl looks like a well-thumbed gig zine: warm paper, dark-brown ink, a burnt-sienna spot colour, and hard printed edges. The screen layouts come from the Stitch "Option A" exploration (Gigl × Beli / DICE). The visual language is Gigl's own.

This document is the source of truth. Every screen is built from the shared pieces in `components/ui.tsx`, plus `components/AppHeader.tsx`, `components/BottomNav.tsx` and `components/Logo.tsx`. The style guide at `/design` (`app/design/DesignPreview.tsx`) shows the same pieces with sample data. It only exists in local dev and preview deployments.

---

## 1. Brand identity

- **Personality**: Editorial, tactile, a little analogue. Printed matter, not glossy app chrome.
- **Surfaces**: Paper page (`#EDE3D0`), cream cards (`#FAF3E2`), and a slightly darker cream for alternating rows (`#F5EDD8`).
- **Ink**: Dark brown `#4A3528` is used for text, borders and shadows. Muted text is `#8B7560`; faint text is `#B8A898`.
- **Accent**: Burnt sienna `#B85827` (hover `#9C4B21`) is used for primary actions, active states, the logo slash and star ratings. `#D4845A` (terra) is a softer secondary accent.
- **Ratings**: Always stars out of 5, in sienna, with partial fills for averages. No numeric scores and no tier descriptors (Elite, Epic, Top Tier…).
- **Type**: Space Grotesk for display (logo, headings, big numbers, pull quotes) and Inter for body and UI text. Labels are small, uppercase and letter-spaced.
- **Print details**: 1.5px ink borders, hard offset shadows with no blur, and 5px corners.
- **Photos**: Artists and people are shown with photos. Artist photos sit in square ink-bordered frames, and profile photos are round. When there's no photo, artists get a halftone tile with a mic icon and people get their initial. Show dates are stuck onto an artist photo's corner like a slightly tilted sticker.
- **Places**: A venue and city sit on one quiet line behind a small sienna map pin, in sentence case, not in uppercase labels.

---

## 2. Tokens (`tailwind.config.js`)

| Token | Value | Use |
|---|---|---|
| `paper` | `#EDE3D0` | Page background, inset tiles, progress tracks |
| `cream` / `cream-alt` | `#FAF3E2` / `#F5EDD8` | Cards / alternating rows |
| `ink` | `#4A3528` | Text, borders, shadows, filled toggles |
| `ink-muted` | `#8B7560` | Secondary text, labels |
| `ink-faint` | `#B8A898` | Timestamps, placeholders, inactive icons |
| `accent` / `accent-hover` | `#B85827` / `#9C4B21` | Primary actions, active states, logo slash |
| `terra` | `#D4845A` | Soft secondary accent |
| `star` | `#B85827` | Star ratings |
| `font-display` / `font-sans` | Space Grotesk / Inter | Display type / body type |
| `border-1.5` | `1.5px` | Riso borders |
| `rounded-card` | `5px` | Cards, buttons, toggles |
| `shadow-riso` / `shadow-riso-lg` | `2px 2px 0` / `3px 3px 0` ink | Raised cards and buttons / floating elements |
| `tracking-label` | `0.08em` | Uppercase labels |
| `.halftone` (in `app/globals.css`) | 5px ink dot grid | Texture for photo placeholders |

Use opacity modifiers for tints: `bg-accent/10`, `border-accent/30`, `border-ink/15`, `border-ink/10`.

---

## 3. Logo & app chrome

- **Logo** (`components/Logo.tsx`): `Gigl` with a capital G, followed by a sienna slash, nothing else. It is set in Space Grotesk bold, 21px, with `-0.5px` tracking, in ink. On Feed and You it takes an `href` and links home; it stays inert on sign-in, choose-username, the intro demo and the style guide, where there is nowhere to go or navigating would break the demo. Headers with a back control pass it to `BackHeader`, which already routes to the feed.
- **Header**: Sticky, `bg-paper/90` with a backdrop blur and a `border-ink/10` bottom rule. The logo or page title sits on the left, and any page actions (such as a share icon button) sit to its right.
  - On Feed, Rankings and Search, **your profile photo sits at the far right**. The header is sticky, so the photo stays in view while scrolling. Tapping it opens You.
  - Leave the photo off on You itself, which has a share button instead, and in the Log flow.
- **Bottom dock**: Three tabs with Log in the centre, using `lucide-react` icons at stroke 1.75:
  1. **Feed** (`Newspaper`)
  2. **Log** (`Plus`), shown as a raised sienna circle with an ink border and a riso shadow
  3. **You** (`CircleUser`), the profile

  The dock is cream with a 1.5px ink top border. Icons are 24px, labels 11px uppercase; the active tab is sienna and inactive tabs are `ink-faint`. Log is a 56px circle whose negative top margin is always (circle height − 34px), so its label stays level with the other two — change the circle and that number moves with it. Feed and You carry an inward padding nudge so they sit nearer the Log button rather than centred in their thirds.

  It used to be five. **Search** was removed because it opened the same screen as Log — both went to `/select-festival`, differing only in a heading — and once search returned only shows that had already happened, "find a show" stopped being a separate idea from "log a show". **Rankings** became a view on Feed rather than a destination: it is the same logged shows read as an aggregate instead of as a stream.

  Log opens `/select-festival`. `/rankings` lights the Feed tab.
- **Focused pages** (artist, stage, public profile, follower lists, legal pages, battle, and the comment and tag-friends sheets) use `BackHeader` (a back chevron plus a title) and no dock. The log flow uses its own title bar with a close button.

---

## 4. Component patterns

Use the component rather than retyping its classes. The class lists are here so the look can be read without opening code.

| Pattern | Component | Classes |
|---|---|---|
| Card | `Card` | `bg-cream border-1.5 border-ink rounded-card shadow-riso` |
| Quiet tile (secondary) | `Card flat`, or these classes | `bg-cream border-1.5 border-ink/15 rounded-card` (no shadow) |
| Inset tile | — | `bg-paper border border-ink/10 rounded-card` |
| Label | `Label` (`tone`: muted, ink or accent) | `text-[10px] font-semibold uppercase tracking-label text-ink-muted` |
| Chip | `Chip` | `px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-label border-1.5`, plus `border-ink/15 text-ink-muted` when inactive or `bg-accent/10 border-accent/30 text-accent` when active |
| Segmented toggle | `Segmented` | Wrapper `flex border-2 border-ink rounded-card overflow-hidden`. Options `flex-1 py-1.5 text-[10px] font-bold uppercase tracking-label`, divided by `border-l-2 border-ink`. Active option `bg-ink text-cream`, inactive `bg-cream text-ink` |
| Underline tabs | — | `text-[10px] font-bold uppercase tracking-label`. Active `text-ink border-b-2 border-accent`, inactive `text-ink-faint` |
| Primary button | `btnPrimary` | `rounded-card bg-accent text-cream border-1.5 border-ink shadow-riso font-display font-bold uppercase tracking-label hover:bg-accent-hover` |
| Secondary button | `btnSecondary` (also `btnQuiet`) | `rounded-card border-1.5 border-ink bg-cream font-bold uppercase tracking-label`. The caller sets the font size |
| Icon button | `iconBtn` | `p-2 rounded-card border-1.5 border-ink bg-cream shadow-riso` |
| Floating pill | — | `rounded-full bg-ink text-cream text-[10px] font-bold uppercase tracking-label shadow-riso-lg` |
| Callout | — | `rounded-card bg-accent/10 border-1.5 border-accent/30` |
| Pull quote | `PullQuote` | `border-l-2 border-accent pl-3 font-display text-[15px] leading-snug` |
| Headings | — | `font-display font-bold tracking-tight`: `text-xl` for card titles, `text-2xl` for page titles |
| Big numbers | `Stat` in stat rows | `font-display font-bold`. Rank numbers are `text-accent` |
| Artist photo | `ArtistPhoto` | Size set by the caller (`w-14 h-14` in lists, `w-[68px] h-[68px]` on feed cards). Frame: `rounded-card border-1.5 border-ink overflow-hidden`, with the image set to `object-cover`. With no photo, the frame is tinted (`bg-terra/25`, `bg-accent/15` or `bg-ink/10`, picked per artist) and holds a `.halftone` layer with a `MicVocal` icon in `text-ink/45`. Overlays such as the date sticker go outside the clipped frame so they can overhang |
| Date sticker | `DateTag` (takes an ISO date) | Month and day on an artist photo's corner: `absolute -bottom-1.5 -right-1.5 -rotate-3 rounded bg-cream border-1.5 border-ink shadow-riso`. The month is 8px uppercase `ink-muted`; the day is 13px `font-display` bold |
| Place line | `Place` | `flex items-center gap-1 text-[12px] text-ink-muted`: a `MapPin` icon (`w-3 h-3 text-accent`), then "Venue, City" truncated to one line |
| Your profile photo (header) | `AppHeader` | `w-9 h-9 rounded-full border-1.5 border-ink shadow-riso` inside a link to You. On You itself it's `w-16 h-16` |
| Other people's photos | `PersonPhoto` | `rounded-full bg-paper border border-ink/15`, `w-8 h-8` in feed cards. Initial in `font-display font-bold text-ink-muted` when there's no photo |
| Star rating | `Stars` | `<StarDisplay accent="currentColor" />` inside a `text-star` element |
| Text input | `inputBox`; `Field` and `fieldInput` in forms | `rounded-card border-1.5 border-ink bg-cream placeholder:text-ink-faint focus:ring-2 focus:ring-accent/40` |
| Progress bar | — | Track `h-2 rounded-full bg-paper border border-ink/15`, fill `bg-accent` |
| Divider | — | `border-ink/10` |
| Empty state | `EmptyState` | `rounded-card border-1.5 border-dashed border-ink/30 bg-cream text-[13px] text-ink-muted`, centred |
| Loading | `LoadingLabel` | Centred 11px uppercase `ink-faint` text |
| Form error | `ErrorNote` | Red-tinted box with `text-[#B03030]` |
| Back header | `BackHeader` | Sticky header with a back chevron and a title |

---

## 5. Core screens

The real screens below all follow the patterns above. The style guide also shows items marked *(mockup)*: features Gigl doesn't have yet. Don't build them without asking.

Where the photos come from:
- **Artist photos**:
  - Search results use `shows.image_url`, the photo Ticketmaster sends with each listing.
  - Everywhere else a logged show appears, the photo comes from `public.artist_images`, looked up by artist name (`lib/artistImages.ts`; `useArtistImages` in client components).
  - The nightly sync fills that table from the headliners of the shows it fetches, then looks up up to 40 logged artists a night that are still missing (`lib/shows/artistImageSync.ts`).
  - Images load with a plain `<img>` from Ticketmaster's CDN, so `next.config.js` needs no change.
- **Profile photos**: `profiles.avatar_url`. You set it by tapping your photo on You, which crops the image to a 512px square and uploads it to the `show-photos` bucket under your own folder (`lib/avatar.ts`).
- An artist or person without a photo falls back to the placeholders in section 4.

### Feed (`/feed`)
- `AppHeader` with the logo and your profile photo.
- Two stacked segmented controls: **All activity / Following** on top, then **Artist rankings** below. The first two filter the stream in place; Artist rankings navigates to `/rankings`, and arriving back from there carries the filter as `?filter=`. They're stacked rather than a row of three because "whose logs" and "the aggregate view" are different questions, and because a three-up row crushes the longer label. The style guide also shows filter chips for weekend, city and genre *(mockup)*.
- Review cards, at **85% of the default component scale** so more fit on screen — `Place`, `PullQuote` and `Chip` take a `compact` prop for this rather than shrinking everywhere, since the same pieces set a slower density on rankings, profiles and the artist page. Each card has:
  - any photos or videos the reviewer attached, full-bleed at the top
  - a compact body (`px-4 pt-3 pb-3 space-y-2`) holding the rows below
  - the reviewer's photo, handle (`text-[12.6px] font-semibold`) and timestamp, with the star rating on the right
  - the artist heading and place line, with the artist photo and date sticker beside them (festival logs show the stage and day instead)
  - the review as a pull quote, then its tags as chips
  - the reaction bar (heart, fire, laugh, wow, comments)
- The Battle Mode card once it's unlocked, and a first-visit tip pointing at the Log button.

### Artist rankings (`/rankings`)
- Reached from the Feed view switch, not the dock. Its own route, so the segmented control navigates rather than toggling state.
- `AppHeader` with an "Everyone's ratings" label and the title, then the same two controls as Feed with Artist rankings selected.
- One list, no day tabs. Splitting by day made sense when every logged show came from a festival lineup and "Saturday" named a real section of the event; with search covering the whole Ticketmaster catalogue it would slice a year of unrelated gigs by weekday. `day` still shows in the place line on festival-sourced rows.
- Ranked cards: a sienna rank number, the artist photo with its date sticker, the artist with stars, the place line, a rating-count chip and any battle record.
- The style guide also shows a milestone callout and a "View gig map" pill *(mockup)*.

### Add a show (`/add-show`)
- `BackHeader` titled "Add a show", no dock — it's part of the log flow.
- Four `Field` inputs: **Artist**, **Date**, **Venue**, and an optional **City** that accepts "San Francisco, CA".
- Artist, Venue and City are all `SuggestField`s: up to five tappable chips of values already in the catalogue, and a "Did you mean …?" line when what's typed is a near miss for one of them. Venues and cities fragment on spelling exactly as artists do — "fillmore sf" is a different room from "The Fillmore" as far as every future search is concerned.
- The matching tolerates dropped articles ("fillmore" → "The Fillmore"), ordinary typos, and names typed short ("brick and morter" → "Brick and Mortar Music Hall"). It never blocks a new value — a band or a basement nobody has logged yet is the reason the page exists.
- The date input is capped at today. A show you haven't been to isn't one you can log.
- Submitting goes straight into logging the new show rather than back to search. If the show turns out to already exist, a card offers to log that one instead.

### Log a show (`/log-show`)
- Title bar ("Log a show" or "Update log") with a close button. There's no dock or profile photo in this flow.
- Selected-show card: the artist photo, the date as a sienna label, the artist and the place line.
- Rating card: the overall stars once all three are set, then tappable Performance / Venue / Crowd star rows.
- Field notes (the review), highlight tags (presets plus custom ones), "Went with" (friend tagging) and "Photos & video" (up to 1 video and 2 photos).
- Full-width primary button: "Save log".
- `/log` is the older festival-lineup picker that leads here. It uses the same list-row pattern.

### Pick a show (`/select-festival`)
- The first step of logging, and the only thing the Log button opens. `AppHeader` titled "What did you see?" under a "Log a show" label.
- Search input for artist, venue or city.
- A row of filter chips under the input: a **Near me** toggle (`MapPin` icon), and while it's on, radius chips for 10 / 50 / 100 mi. Location is asked for on arrival, so the chip reports the filter rather than starting it; it reads "Locating…" and is disabled while the browser answers. Turning it off is remembered. When location is blocked or unavailable, an 11px `ink-faint` line under the chips says so.
- A "This past week" label that changes to "Results for …" while typing, and carries "within N mi" while Near me is on. The catalogue only holds shows that have already happened — you log what you went to — so results run newest first, last night at the top.
- One card of result rows, alternating `cream` / `cream-alt`. Each row has the artist photo with a date sticker, the artist, the place line, any support acts and a "+ Log" button. With Near me on, the distance ("4.2 mi") sits above that button in the same 10px uppercase `ink-faint` style. Tapping a row goes straight into logging.
- A dashed "Can't find your show?" tile, linking to **Add a show**.

### You (`/profile`)
- `AppHeader` with the logo and a share button, which shares or copies your public profile link. There's no profile photo in the header, since this page is your profile.
- Profile card:
  - your photo (`w-16 h-16`) with a sienna camera badge; tapping it adds or changes the photo. Under your name and handle, "+ Add a photo" or "Remove photo".
  - a stats row in two pairs, split by a 1.5px ink rule: gigs and average rating (stars), then followers and following
  - the style guide also shows a city place line *(mockup)*
- "My rankings": ranked cards like the Rankings page, with any media, the review and tags. Each card's edit button opens an inline editor for the photo, review and tags, with options to update the ratings or remove the log.
- Footer links: Sign out, Privacy Policy, Terms of Service.
- The style guide also shows live streak, soundprint and yearly goal cards *(mockup)*.

### Other screens
- **Public profile** (`/u/[username]`): the You layout, read-only, with a Follow button and a "Join Gigl" call to action.
- **Artist** (`/artist/[id]`):
  - a large artist photo with the place line and average stars
  - a strip of fan photos
  - a stats card: number of ratings, plus average and top rating as stars
  - a Performance / Venue / Crowd breakdown
  - review cards
- **Stage** (`/stage/[name]`), **Battle** (`/battle`), the follower lists, sign-in, username and legal pages all use the same pieces.
- **Landing** (`/`, `components/IntroDemo.tsx`): a 16-second tour played in a mock phone (ink bezel, `shadow-riso-lg`) and built from the real components. It has four scenes: the feed with the Log tip and a tap, show search with a pick, star rating, and rankings. A "1 of 4" label and caption above the phone and progress dots below follow the scenes. Tapping or swiping anywhere, Skip, or the end of the tour goes to sign-up.
- **Sign-in** (`/auth`): logo header, a slightly rotated collage of two app cards (an artist card with its date sticker and stars, and a review quote), the headline, a Sign up / Sign in segmented toggle, then the fields and button in a card. **Choose username** follows the same layout, with a feed-card preview that shows your handle as you type.

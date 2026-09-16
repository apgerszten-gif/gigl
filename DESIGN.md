# Gigl Design System: Warm Riso Zine

Gigl looks like a well-thumbed gig zine: warm paper, dark-brown ink, a burnt-sienna spot colour, and hard printed edges. The screen layouts come from the Stitch "Option A" exploration (Gigl × Beli / DICE). The visual language is Gigl's own.

This document is the source of truth. The rendered reference is the style guide at `/design` (`app/design/DesignPreview.tsx`). It only exists in local dev and preview deployments.

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

- **Logo** (`components/Logo.tsx`): `Gigl` with a capital G, followed by a sienna slash, nothing else. It is set in Space Grotesk bold, 21px, with `-0.5px` tracking, in ink.
- **Header**: Sticky, `bg-paper/90` with a backdrop blur and a `border-ink/10` bottom rule. The logo or page title sits on the left, and any page actions (such as a share icon button) sit to its right.
  - On Feed, Rankings and Search, **your profile photo sits at the far right**. The header is sticky, so the photo stays in view while scrolling. Tapping it opens You.
  - Leave the photo off on You itself, which has a share button instead, and in the Log flow.
- **Bottom dock**: Five tabs with Log in the centre, using `lucide-react` icons at stroke 1.75:
  1. **Feed** (`Newspaper`)
  2. **Rankings** (`BarChart2`)
  3. **Log** (`Plus`), shown as a raised sienna circle with an ink border and a riso shadow
  4. **Search** (`Search`)
  5. **You** (`CircleUser`), the profile

  The dock is cream with a 1.5px ink top border. Labels are 9px uppercase; the active tab is sienna and inactive tabs are `ink-faint`. Search is the fourth tab so that Log can sit in the middle with two tabs either side.

---

## 4. Component patterns

| Pattern | Classes |
|---|---|
| Card | `bg-cream border-1.5 border-ink rounded-card shadow-riso` |
| Quiet tile (secondary) | `bg-cream border-1.5 border-ink/15 rounded-card` (no shadow) |
| Inset tile | `bg-paper border border-ink/10 rounded-card` |
| Label | `text-[10px] font-semibold uppercase tracking-label text-ink-muted` |
| Chip | `px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-label border-1.5`, plus `border-ink/15 text-ink-muted` when inactive or `bg-accent/10 border-accent/30 text-accent` when active |
| Segmented toggle | Wrapper `flex border-2 border-ink rounded-card overflow-hidden`. Options `flex-1 py-1.5 text-[10px] font-bold uppercase tracking-label`, divided by `border-l-2 border-ink`. Active option `bg-ink text-cream`, inactive `bg-cream text-ink` |
| Underline tabs | `text-[10px] font-bold uppercase tracking-label`. Active `text-ink border-b-2 border-accent`, inactive `text-ink-faint` |
| Primary button | `rounded-card bg-accent text-cream border-1.5 border-ink shadow-riso font-display font-bold uppercase tracking-label hover:bg-accent-hover` |
| Secondary button | `rounded-card border-1.5 border-ink text-[10px] font-bold uppercase tracking-label` |
| Icon button | `p-2 rounded-card border-1.5 border-ink bg-cream shadow-riso` |
| Floating pill | `rounded-full bg-ink text-cream text-[10px] font-bold uppercase tracking-label shadow-riso-lg` |
| Callout | `rounded-card bg-accent/10 border-1.5 border-accent/30` |
| Pull quote | `border-l-2 border-accent pl-3 font-display text-[15px] leading-snug` |
| Headings | `font-display font-bold tracking-tight`: `text-xl` for card titles, `text-2xl` for page titles |
| Big numbers | `font-display font-bold`. Rank numbers are `text-accent` |
| Artist photo | Size set by the caller (`w-14 h-14` in lists, `w-[76px] h-[76px]` on feed cards). Frame: `rounded-card border-1.5 border-ink overflow-hidden`, with the image set to `object-cover`. With no photo, the frame is tinted (`bg-terra/25`, `bg-accent/15` or `bg-ink/10`, picked per artist) and holds a `.halftone` layer with a `MicVocal` icon in `text-ink/45`. Overlays such as the date sticker go outside the clipped frame so they can overhang |
| Date sticker | Month and day on an artist photo's corner: `absolute -bottom-1.5 -right-1.5 -rotate-3 rounded bg-cream border-1.5 border-ink shadow-riso`. The month is 8px uppercase `ink-muted`; the day is 13px `font-display` bold |
| Place line | `flex items-center gap-1 text-[12px] text-ink-muted`: a `MapPin` icon (`w-3 h-3 text-accent`), then "Venue, City" truncated to one line |
| Your profile photo (header) | `w-9 h-9 rounded-full border-1.5 border-ink shadow-riso` inside a button that opens You. On You itself it's `w-16 h-16` |
| Other people's photos | `rounded-full bg-paper border border-ink/15`, `w-8 h-8` in feed cards. Initial in `font-display font-bold text-ink-muted` when there's no photo |
| Star rating | `<StarDisplay accent="currentColor" />` inside a `text-star` element |
| Text input | `rounded-card border-1.5 border-ink bg-cream placeholder:text-ink-faint focus:ring-2 focus:ring-accent/40` |
| Progress bar | Track `h-2 rounded-full bg-paper border border-ink/15`, fill `bg-accent` |
| Divider | `border-ink/10` |

---

## 5. Core screens

The style guide renders each of these with sample data. Items marked *(mockup)* are features Gigl doesn't have yet, and items marked *(needs data)* need data Gigl doesn't store yet. Don't build either without asking.

- **Artist photos** *(needs data)*: Ticketmaster returns event and artist images, but the nightly sync doesn't save them. Showing them needs an image URL column on `shows` and the Ticketmaster image host added to `next.config.js`.
- **Profile photos** *(needs data)*: `profiles` has no photo column and there's no upload flow.
- Until then, both fall back to the placeholders in section 4.

### Feed (`/feed`)
- Header with the logo, and your profile photo at the far right.
- Segmented toggle: Activity / Following / Popular *(mockup)*.
- Filter chips: this weekend, city, genre *(mockup)*.
- Review cards, each with:
  - the reviewer's photo, handle and timestamp
  - the star rating, top right
  - the artist heading and place line, with the artist photo and date sticker beside them
  - pull-quote field notes *(mockup)*
  - highlight chips *(mockup)*

### Rankings (`/rankings`)
- Header with a "My music index" label, the page title, a share icon button and your profile photo.
- Underline tabs: Been / Want to see *(mockup)* / Festivals / Recs *(mockup)*.
- Milestone callout *(mockup)*.
- Ranked cards, each with:
  - a sienna rank number and the artist photo
  - the artist, with stars beside the title
  - the place line
  - a note chip
- Floating "View gig map" pill *(mockup)*.

### Log a show (`/log-show`)
- Top bar with Cancel, a step label and a Draft chip. There is no header or profile photo in this flow.
- Selected-show card: the artist photo, the date as a sienna label, the artist, the place line and an edit icon.
- Rating card: the overall stars, plus Performance / Venue / Crowd stars in inset tiles.
- Field notes input with a character count *(mockup)*.
- Highlight chips that toggle on and off *(mockup)*.
- Tiles for "Went with" (friend tagging) and "Photo / Setlist" (setlist is *(mockup)*).
- Full-width primary button: "Save & publish".

### Search (currently `/select-festival`)
- Header with the page title "Find a show" and your profile photo.
- Search input for artist, venue or city: a card with a search icon.
- A "Coming up" label that changes to a match count while typing.
- One card of result rows, alternating `cream` / `cream-alt`. Each row has:
  - the artist photo with a date sticker
  - the artist and place line
  - a "+ Log" secondary button that goes straight into logging

### You (`/profile`)
- Header with the logo and a share icon button. There's no profile photo here, since this page is your profile.
- Profile card:
  - your photo (`w-16 h-16`), name, handle, a place line for your city, and an Edit button
  - a stats row in two pairs, split by a 1.5px ink rule: gigs and rank *(mockup)*, then followers and following. The four stat labels use 9px text with `tracking-wide` so they fit.
- Live streak and soundprint cards *(mockup)*.
- Yearly goal progress card *(mockup)*.
- Directory tiles: attended, want to see *(mockup)*, festivals, buddies *(mockup)*.
- Latest log card: the artist photo, the artist, the place line and the stars.

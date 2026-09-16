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

Use opacity modifiers for tints: `bg-accent/10`, `border-accent/30`, `border-ink/15`, `border-ink/10`.

---

## 3. Logo & app chrome

- **Logo** (`components/Logo.tsx`): `Gigl` with a capital G, followed by a sienna slash, nothing else. It is set in Space Grotesk bold, 21px, with `-0.5px` tracking, in ink.
- **Header**: Sticky, `bg-paper/90` with a backdrop blur and a `border-ink/10` bottom rule. The logo or page title sits on the left and actions on the right (search icon, avatar or share button).
- **Bottom dock**: Four tabs, using `lucide-react` icons at stroke 1.75:
  1. **Feed** (`Newspaper`)
  2. **Rankings** (`BarChart2`)
  3. **Log** (`Plus`), shown as a raised sienna circle with an ink border and a riso shadow
  4. **Diary / profile** (`BookMarked`)

  The dock is cream with a 1.5px ink top border. Labels are 9px uppercase; the active tab is sienna and inactive tabs are `ink-faint`.

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
| Avatar | Initials circle: `rounded-full bg-paper border border-ink/15 text-ink-faint font-display font-bold` (there are no photos yet) |
| Star rating | `<StarDisplay accent="currentColor" />` inside a `text-star` element |
| Text input | `rounded-card border-1.5 border-ink bg-cream placeholder:text-ink-faint focus:ring-2 focus:ring-accent/40` |
| Progress bar | Track `h-2 rounded-full bg-paper border border-ink/15`, fill `bg-accent` |
| Divider | `border-ink/10` |

---

## 5. Core screens

The style guide renders each of these with sample data. Items marked *(mockup)* are features Gigl doesn't have yet. Don't build them without asking.

### Feed (`/feed`)
- Header with the logo, a search icon and the avatar.
- Segmented toggle: Activity / Following / Popular *(mockup)*.
- Filter chips: this weekend, city, genre *(mockup)*.
- Review card:
  - reviewer initials, handle and timestamp · venue
  - star rating, top right
  - artist heading with an event label
  - pull-quote field notes *(mockup)*
  - highlight chips *(mockup)*

### Rankings (`/rankings`)
- Header with a "My music index" label, the page title and a share icon button.
- Underline tabs: Been / Want to see *(mockup)* / Festivals / Recs *(mockup)*.
- Milestone callout *(mockup)*.
- Ranked cards: a sienna rank number, the artist and venue, stars beside the title, and a note chip.
- Floating "View gig map" pill *(mockup)*.

### Log a show (`/log-show`)
- Top bar with Cancel, a step label and a Draft chip.
- Selected-show card with an initial tile and an edit icon.
- Rating card: the overall stars, plus Performance / Venue / Crowd stars in inset tiles.
- Field notes input with a character count *(mockup)*.
- Highlight chips that toggle on and off *(mockup)*.
- Tiles for "Went with" (friend tagging) and "Photo / Setlist" (setlist is *(mockup)*).
- Full-width primary button: "Save & publish".

### Diary / profile (`/profile`)
- Header with the logo and a share icon button.
- Profile card: initials, name, handle, an Edit button, and a stats row (gigs, followers, rank *(mockup)*).
- Live streak and soundprint cards *(mockup)*.
- Yearly goal progress card *(mockup)*.
- Directory tiles: attended, want to see *(mockup)*, festivals, buddies *(mockup)*.
- Latest log card with its stars.

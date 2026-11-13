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

- **Logo** (`components/Logo.tsx`): `Gigl` with a capital G, followed by a sienna slash, nothing else. It is set in Space Grotesk bold, 23px, with `-0.5px` tracking, in ink. On Feed and You it takes an `href` and links home; it stays inert on sign-in, choose-username, the intro demo and the style guide, where there is nowhere to go or navigating would break the demo. Headers with a back control pass it to `BackHeader`, which already routes to the feed.
- **Header**: Sticky, `bg-paper/90` with a backdrop blur and a `border-ink/10` bottom rule. The logo or page title sits on the left, and any page actions (such as a share icon button) sit to its right.
  - On Feed, Rankings and Search, **your profile photo sits at the far right**. The header is sticky, so the photo stays in view while scrolling. Tapping it opens You.
  - Leave the photo off on You itself, which has a share button instead, and in the Log flow.
- **Bottom dock**: Three tabs with Log in the centre, using `lucide-react` icons at stroke 1.75:
  1. **Feed** (`Newspaper`)
  2. **Log** (`Plus`), shown as a raised sienna circle with an ink border and a riso shadow
  3. **You** (`CircleUser`), the profile

  The dock is cream with a 1.5px ink top border. Icons are 24px, labels 11px uppercase; the active tab is sienna and inactive tabs are `ink-faint`. Log is a 56px circle whose negative top margin is always (circle height − 34px), so its label stays level with the other two — change the circle and that number moves with it. Feed and You carry an inward padding nudge so they sit nearer the Log button rather than centred in their thirds.

  It used to be five. **Search** was removed because it opened the same screen as Log — both went to `/select-festival`, differing only in a heading — and once search returned only shows that had already happened, "find a show" stopped being a separate idea from "log a show". **Rankings** became a view on Feed rather than a destination: it is the same logged shows read as an aggregate instead of as a stream.

  Log opens `/select-festival`. `/rankings` lights the Feed tab. Signed out, You opens sign-in (`/auth`), since there's no profile to show.
- **Focused pages** (a show's reviews, an artist's or venue's shows, stage, public profile, follower lists, legal pages, battle, and the comment and tag-friends sheets) use `BackHeader` (a back chevron plus a title) and no dock. The log flow uses its own title bar with a close button.

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
| Date sticker | `DateTag` (takes an ISO date) | Month and day on an artist photo's corner: `absolute -bottom-1.5 -right-1.5 -rotate-3 rounded bg-cream border-1.5 border-ink shadow-riso`. The month is 8px uppercase `ink-muted`; the day is 13px `font-display` bold. For a show outside the current year, the year sits underneath in 6.5px bold `ink-muted`, and written dates (`formatShowDate`, e.g. the sienna date above the artist on the log screen) read "Oct 19, 2025" |
| Place line | `Place` | `flex items-center gap-1 text-[12px] text-ink-muted`: a `MapPin` icon (`w-3 h-3 text-accent`), then "Venue, City" truncated to one line. A festival log's place is its stage and day with the festival after them, "Lands End · Saturday (Outside Lands)" (`placeOf`) |
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
| Show rows | `PastShowRows`, `UpcomingShowRows`, `ShimmerRows` (`components/ShowRows.tsx`) | One `Card` of rows alternating `cream` / `cream-alt`, divided by `border-ink/10`: the artist photo (`w-14 h-14`) with its date sticker, a 15px display title, the place line, an 11px `ink-faint` note (support acts), and one action on the right — "+ Log" (`btnSecondary`, 10px) for a show that's happened, Save (`btnSecondary` with `Bookmark`, turning into a primary "Saved" with `Check`) for one that hasn't. A past row Gigl has ratings for shows small stars and "N ratings" under the place line, and tapping it opens that show's reviews; otherwise tapping a past row starts logging it |

---

## 5. Core screens

The real screens below all follow the patterns above. The style guide also shows items marked *(mockup)*: features Gigl doesn't have yet. Don't build them without asking.

Where the photos come from:
- **Artist photos**:
  - Search results use `shows.image_url`, the photo Ticketmaster sends with each listing. A listing without one, and every setlist.fm result, falls back to `artist_images`, and for an artist that table has never seen, a Ticketmaster artist lookup made while the search is answered (`artistPhotos` in `lib/shows/artistImageSync.ts`: up to 2 per catalogue search, 4 per setlist.fm search). The answer, photo or not, is saved, so each artist is looked up once a month at most.
  - Everywhere else a logged show appears, the photo comes from `public.artist_images`, looked up by artist name (`lib/artistImages.ts`; `useArtistImages` in client components).
  - The nightly sync fills that table from the headliners of the shows it fetches, then looks up up to 40 logged artists a night that are still missing (`lib/shows/artistImageSync.ts`).
  - Small local acts are often not on Ticketmaster at all, and show the placeholder.
  - Festival imports fill in acts Ticketmaster has no photo of. `scripts/import-festival.mjs` copies the festival's own press photos into the public `artist-photos` storage bucket, and writes them to `artist_images` with `source = 'festival'`.
  - Images load with a plain `<img>`, from Ticketmaster's CDN or the `artist-photos` bucket, so `next.config.js` needs no change.
- **Profile photos**: `profiles.avatar_url`. You set it by tapping your photo on You, which crops the image to a 512px square and uploads it to the `show-photos` bucket under your own folder (`lib/avatar.ts`).
- An artist or person without a photo falls back to the placeholders in section 4.

### Feed (`/feed`)
- `AppHeader` with the logo and your profile photo.
- A search box under the two view bars (below), the same place as on Rankings (`components/FeedSearch.tsx`), shown signed in or out: `inputBox` with `shadow-riso`, a `Search` icon, "Artists, venues, shows, people", and an `X` to clear once something's typed (Escape clears too). From two characters, its results replace the stream below it; everything above stays where it is, so the box never moves while you type, and picking All activity or Following clears the search. The results come in sections under small `Label`s:
  - **Reviews** first: up to four shows people have rated whose artist or venue matches, most-rated first, in the show-row pattern with their stars and "N ratings". Tapping one opens that show's reviews and setlist; "+ Log" still logs it straight away.
  - **Artists** and **Venues**: one card of link rows (photo, or a halftone tile with a `Building2` icon for a venue; the name; a venue's place line; "N shows" in 10px uppercase `ink-faint`; a `ChevronRight`), each opening that artist's or venue's page.
  - **Coming up** (Save) and **Past shows** (+ Log), up to six each, in the show-row pattern. Tonight's shows go under Past, and a show already under Reviews isn't repeated there.
  - **People**, as the follower-list rows with a Follow button.
  - The dashed "Can't find your show?" tile last, and "Nothing on Gigl matches …" when every section is empty.
  - The search is kept in the URL (`/feed?q=…`), so back from an artist or venue page lands on the same results. Nothing in it is filtered by location.
- Review reminders (`components/ReviewReminders.tsx`) above the controls, only when a saved show has passed: a card per show, up to three, with the artist photo and date sticker, a "How was it?" accent label, the artist and place, a small "Rate it" primary button and a quiet "Didn't go".
- Two stacked segmented controls: **All activity / Following** on top, then **Artist rankings / Venue rankings** below. The first two filter the stream in place; the rankings navigate to `/rankings` (`?view=venues` for venues), and arriving back from there carries the filter as `?filter=`. They're stacked rather than one row because "whose logs" and "the aggregate views" are different questions, and because a four-up row crushes the labels. The style guide also shows filter chips for weekend, city and genre *(mockup)*.
- Review cards, at **85% of the default component scale** so more fit on screen — `Place`, `PullQuote` and `Chip` take a `compact` prop for this rather than shrinking everywhere, since the same pieces set a slower density on rankings, profiles and the artist page. Each card has:
  - any photos or videos the reviewer attached, full-bleed at the top
  - a compact body (`px-4 pt-3 pb-3 space-y-2`) holding the rows below
  - the reviewer's photo, handle (`text-[12.6px] font-semibold`) and timestamp, with the star rating on the right
  - the artist heading and place line, with the artist photo and date sticker beside them (festival logs show the stage and day instead, with the festival in parentheses)
  - the review as a pull quote, with tagged people's `@username` as sienna underlined links to their profiles, then its tags as chips
  - when anyone is tagged, a "with @mo and @mei" line (`WithLine` in `components/TagDisplay.tsx`): up to three overlapping 18px photos, then the handles in `ink`, "and 2 others" past three
  - the reaction bar (heart, fire, laugh, wow, comments)
- The Battle Mode card once it's unlocked, and a first-visit tip pointing at the Log button.
- Signed out, a `Card` above the controls: "Rate the shows you've been to", a line in `ink-muted` saying an account is only needed to post, a small "Log a show" primary button (to `/select-festival`) and an "I have an account" link. Reacting, commenting or picking Following opens the sign-up sheet instead of doing nothing.

### Rankings (`/rankings`)
- Reached from the Feed's view switch, not the dock. Its own route; the two filter options navigate back to Feed, while **Artist rankings / Venue rankings** switch in place.
- The same `AppHeader` as Feed (the logo, linking home, and your profile photo on the right), so the header never changes anywhere on the Feed tab. There's no page title: the second bar already says which ranking is showing. Then the same two controls as Feed with a rankings option selected.
- A search box (`inputBox` with `shadow-riso`, a `Search` icon and an `X` to clear): "Search artists", or "Search venues or cities". It narrows the list as you type, and every card keeps its real rank number ("#12"), not its place among the matches.
- A **Rank by** row: a `Label`, then three `Chip` toggles, led by the stars that matter most to the list: **Performance / Venue / Both** on Artist rankings, **Venue / Performance / Both** on Venue rankings. Each list opens ranked on its first chip, and switching lists goes back to that list's first. Both averages the Performance and Venue stars. The view and any choice other than the list's first are kept in the URL (`?view=venues&by=both`).
- **Artist rankings** are one card per artist across every show of theirs anyone has rated (names matched loosely, so "Charli XCX" and "Charli xcx" are one artist), not one card per show. **Venue rankings** are one card per venue and city: the city comes from the catalogue, so a venue only known from setlist.fm logs has no place line, and festival stages aren't venues.
- Ranked cards: a sienna rank number, the artist photo (or a halftone `Building2` tile for a venue), the name with the stars it's ranked on, a venue's place line, then both averages small ("PERFORMANCE ★★★★★ VENUE ★★★★☆", the one not in use faint), and chips for shows and ratings. An artist's card carries their battle record summed over all their shows. Tapping a card opens the artist's or venue's page. Ties go to the one with more ratings.
- The "N shows" and "N ratings" chips each end in a small `ChevronRight` and open a sheet over the list (`components/RankingDetailSheet.tsx`), styled like the sign-up sheet: the name as a `text-2xl` display title with the accent full stop, "5 ratings, ranked by Performance" in `ink-muted`, and a close `X`. **Shows** lists that artist's or venue's rated shows ranked on their own, the way Rankings used to list every show: a small sienna rank number, the artist photo with its date sticker, the venue (on an artist's card) or the act (on a venue's card), the stars on the current Rank by choice and "N ratings". **Ratings** lists every rating behind the card as small cards: the rater's photo and @handle with their stars, the show and date in 11px `ink-muted`, and their review as a compact pull quote. Every row opens that show's page of reviews. Read with the viewer's session, so people they've blocked stay out.
- One list, no day tabs. Splitting by day made sense when every logged show came from a festival lineup and "Saturday" named a real section of the event; with search covering the whole Ticketmaster catalogue it would slice a year of unrelated gigs by weekday.
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
- Rating card: the overall stars once both are set (or "Both required" in faint italic until then), then tappable Performance and Venue star rows. There's no Crowd rating any more.
- Field notes (the review) and "Photos & video" (up to 1 video and 2 photos). Highlight tags were taken off to keep logging quick; a log re-rated here keeps any it already had, and they still show on feed cards and can be edited from You.
- Tagging who you went with (`components/TagPeople.tsx`), in two places that add nothing to the screen until they're used:
  - Typing `@` in Field notes opens a list under the box: "People you follow" while nothing's typed after the @, then "Following" and "Everyone on Gigl" as you type. Each row is the person's photo, name and handle, with a small "+ Follow" (`btnSecondary`) on anyone you don't follow, which tags and follows in one tap; tapping the row just tags. Picking writes `@username` into the review, tinted `bg-accent/15 text-accent`.
  - Under Photos & video, a search field reading "Did you go with another Gigl user?" with the same list. Once anyone is tagged, a "Went with" label and their chips (round photo, `@username` in sienna, an × to untag) sit above it and the field reads "Anyone else?".
- Full-width primary button: "Save log".
- Signed out, the whole screen works. An 11px `ink-faint` line under Save says posting asks for an account, and Save opens the sign-up sheet over the log rather than leaving it.
- `/log` is the older festival-lineup picker that leads here. It uses the same list-row pattern.

### Pick a show (`/select-festival`)
- The first step of logging, and what the Log button opens. `AppHeader` titled "What did you see?" under a "Log a show" label.
- A **Been to / Upcoming** segmented control above the search input for artist or venue. Upcoming changes the title to "What are you seeing?" under a "Save a show" label, and the list to shows that haven't happened, soonest first, labelled "Coming up". Its rows use the same pattern, but only their Save button acts: `btnSecondary` with a `Bookmark`, turning into a primary "Saved" with a `Check`. Under the list, a full-width `btnSecondary` "Show more" (11px, "Loading…" while it works) appends the next 50 shows, and disappears when there are none left. Signed out, Save opens the sign-up sheet. Signed in with a phone number, an unticked 11px checkbox under the chips asks to text reminders too. There's no More shows card or "Can't find your show?" tile on Upcoming.
- A row of filter chips under the input: a **Near me** toggle (`MapPin` icon), and while it's on, radius chips for 10 / 50 / 100 mi. Location is asked for on arrival, so the chip reports the filter rather than starting it; it reads "Locating…" and is disabled while the browser answers. Turning it off is remembered. When location is blocked or unavailable, an 11px `ink-faint` line under the chips says so.
- Beside it, a **Search city** chip (`Building2` icon) for searching a place without sharing a location. It opens a "Type a city" input with matches in a card below; picking one turns the chip on, showing the city with an `X` to clear it, and the radius chips apply to that city. Picking a city turns Near me off, and tapping Near me clears the city. The city is remembered on the device.
- A "This past week" label that changes to "Results for …" while typing, and carries "within N mi" while Near me is on ("within N mi of Portland" for a typed city). Browsing shows the past week; a search reaches back a year. Only shows that have already happened appear — you log what you went to — so results run newest first, last night at the top.
- One card of result rows, alternating `cream` / `cream-alt`. Each row has the artist photo with a date sticker, the artist, the place line, any support acts and a "+ Log" button. With Near me or a city on, the distance ("4.2 mi") sits above that button in the same 10px uppercase `ink-faint` style. Tapping a row goes straight into logging.
- Once a search is 3 or more characters, a second card, **More shows**, lists shows from the past five years from setlist.fm that the catalogue doesn't have, newest first, in the same row style. Under it, a full-width `btnSecondary` "Show earlier shows" (11px, "Loading…" while it works) appends the next, older batch; it disappears when there's nothing older. Its label row carries a "via setlist.fm" link on the right (10px uppercase `ink-faint`, underlined), which setlist.fm's terms require wherever its data appears. It shows two shimmer rows while loading, and "Nothing … matched" is held back until it has answered.
- A dashed "Can't find your show?" tile, linking to **Add a show**.

### You (`/profile`)
- `AppHeader` with the logo and an "Invite friends to Gigl" button (`btnSecondary`, with the share icon), which shares or copies your public profile link. There's no profile photo in the header, since this page is your profile.
- Profile card:
  - your photo (`w-16 h-16`) with a sienna camera badge; tapping it adds or changes the photo. Under your name and handle, "+ Add a photo" or "Remove photo".
  - a "Search for other users" field (`components/UserSearch.tsx`) that looks up other accounts by name or handle, listing them in the follower-list row with a Follow button; tapping a row opens their profile
  - a stats row in two pairs, split by a 1.5px ink rule: gigs and average rating (stars), then followers and following
  - the style guide also shows a city place line *(mockup)*
- "Saved shows" (`components/SavedShowsSection.tsx`): your upcoming saved shows in alternating rows with a remove `X`, then a dashed "Going to a show soon?" tile linking to the Upcoming list. It's private, and doesn't appear on the public profile.
- "My rankings": ranked cards like the Rankings page, with any media, the review and tags. Each card's edit button opens an inline editor for the photo, review and tags, with options to update the ratings or remove the log.
- "Tagged in" (`TaggedInList`), when anyone has tagged you: a card per log with the artist photo and date sticker, the artist, the place and "Tagged by @them", and an × that untags you. Public profiles show the same list without the ×.
- Footer links: Sign out, Privacy Policy, Terms of Service, Contact us, Delete account.
- The style guide also shows live streak, soundprint and yearly goal cards *(mockup)*.

### Artist and venue pages (`/artists?name=…`, `/venues?name=…&city=…&state=…`)
- Opened from the Feed's search, and from the artist name and the place line on a show's page. A venue is its name and its city: nine cities have a Fillmore. Query strings rather than path segments, because names carry slashes (`lib/showLinks.ts`).
- `BackHeader` with the logo, going back to wherever you came from (the Feed's search results).
- A header like a show's page: the artist photo (`w-24 h-24`), or a halftone tile with a `Building2` icon for a venue; an "Artist" or "Venue" `Label`; the name in 28px display; a venue's place line, or an artist's average stars across every rated show.
- A `Stat` card: Coming up, Past shows (Past year on a venue) and Ratings.
- **Coming up**: every listed show ahead, soonest first, in show rows with Save. **Past shows**: newest first, with + Log, and stars on any Gigl has ratings for. Ten of each, then a full-width `btnSecondary` "Show more" adds 25. On an artist's page a row is titled by the venue, with "Supporting <headliner>" when they weren't top of the bill; on a venue's page, by the act.
- **More past shows**, from setlist.fm, with the "via setlist.fm" link on its label row: loaded straight away when the page has fewer than five past shows, otherwise behind a "Look for older shows" button, then "Show earlier shows" for each older batch. Nights the page already lists are left out, so a show's openers don't turn up as shows of their own.
- An artist's page also lists shows people have logged that the catalogue doesn't have (setlist.fm logs, festival sets). A festival set has no + Log, since it's logged from its lineup.

### Sharing (`/i/<token>`, `/r/<handle>/<show>`)
- **Invite to an upcoming show** (`components/InviteSheet.tsx`): from the Share icon on each saved show on You, or the "Saved {artist} · Invite friends" bar that floats above the dock for six seconds after any save (a `bg-ink` pill, `shadow-riso-lg`). The sheet shows a preview card with an "I'm going" chip, a "Show my name" switch, and a primary "Send invite" that opens the phone's share sheet (or copies the link). "Turn off this link" ends it. Saved rows show a sienna "Richard's in" chip for each friend who said yes.
- **Invite page** (`/i/<token>`): logo bar, the artist photo large with a date sticker, "Alex is going" with their photo, the artist in 30px display, the place line (to the venue page) and date, then a primary "I'm going too" and a quiet "Not for me". Signed out, the button opens the sign-up sheet ("Tell Alex you're in") and finishes after; then "You're in" with a Follow card.
- **Send your take** (`components/ShareReviewSheet.tsx`): from the Share icon on your own feed cards and profile logs, the "Logged." sheet after saving a log, and the first-show celebration. A preview card, a "Hide my stars until they rate" switch, and Share.
- **Review page** (`/r/<handle>/<show>`): one card with the review's photos, @handle and stars (or "?????" in sienna when hidden), the artist (to the show's reviews), place, date and pull quote. Then a primary "Were you there? Rate it" and a quiet "Just reading? See everyone's reviews". Once the viewer has rated, a "You and Alex" pair of flat cards compares Performance and Venue stars with one line on where they differ. The author sees "Send to friends" instead.
- **Link previews** are 1200×630 riso cards: the artist photo with a tilted date sticker, an accent chip ("Alex is going", "Alex's take"), the artist, place, stars and a pull quote.

### Other screens
- **Public profile** (`/u/[username]`): the You layout, read-only, with a Follow button and a "Join Gigl" call to action.
- **Show** (`/artist/[id]`), one show's reviews. The artist's name links to their page, and the place line to the venue's page when the catalogue knows the venue's city:
  - a large artist photo with the place line and average stars
  - a strip of fan photos
  - a stats card (`components/ShowRatingsCard.tsx`): number of ratings, plus average and top rating as stars. The average carries a small chevron and opens a flat Performance / Venue breakdown card under it; the breakdown is folded away by default
  - two buttons side by side, each half the row: **See the setlist** and a primary **+ Log it** (`components/LogThisShow.tsx`). Log it is hidden once you've logged the show, and for a festival set, which is logged from its lineup; the setlist button then takes the whole row
  - **Setlist sheet** (`components/SetlistPanel.tsx`, also on the review page), a `btnSecondary` "See the setlist" that opens a bottom sheet over the page (the `SignUpSheet` pattern: `bg-ink/55` scrim, `bg-paper` panel, the artist in `text-2xl` display with the accent full stop, venue, date and tour under it, an `X`). In it, "N songs" and the "via setlist.fm" link on one label row, then the songs in one `Card` of alternating rows numbered in sienna display type, each set or encore under an accent `Label`, covers, guests and setlist.fm's notes in an 11px `ink-muted` line, a song played from tape unnumbered in italic with a `Disc3` icon, and an arrow for a segue. With no setlist, an `EmptyState` says so
  - review cards ("What people are saying")
- **Stage** (`/stage/[name]`), **Battle** (`/battle`), the follower lists, sign-in, username and legal pages all use the same pieces.
- **Landing** (`/`): a server redirect to the feed (`next.config.js`), signed in or not, so a QR scan lands in one hop. The feed sends an account without a username on to Choose username. It used to play the intro tour in `components/IntroDemo.tsx`, a 14-second tour in a mock phone (ink bezel, `shadow-riso-lg`) with four scenes (the feed with the Log tip and a tap, show search with a pick, star rating, and rankings) that ended at sign-up. The tour is no longer shown but is kept in case it's wanted back.
- **Sign-up sheet** (`components/SignUpSheet.tsx`): asks for an account in place, over the page, when someone signed out tries to post, react, comment or follow. A bottom sheet on a `bg-ink/55` scrim: `bg-paper`, a 1.5px ink border on the top and sides, `rounded-t-card`. A `text-2xl` display title with the accent full stop, a one-line reason in `ink-muted`, a close button, then the same phone and code steps as sign-in (`components/PhoneCodeForm.tsx`) and the same "Sign in with email" link for older accounts. An account without a username gets one more step for it, with a full-width primary button named for what happens next ("Post").
- **Sign-in** (`/auth`): logo header, then a slightly rotated collage of two app cards (an artist card with its date sticker and stars, and a review quote). Below that are the headline and a card that changes by step:
  - **Phone:** the phone number field, which adds dashes as you type (555-123-4567), and "Text me a code". This one step both signs people up and signs them back in. A "Sign in with email" link under the card is for accounts made before phone sign-up.
  - **Code:** the number the code went to, with a Change link; a large spaced code field that submits once all 6 digits are in; Continue; and a resend link with a 60-second countdown.
  - **Email:** email, password and Sign in, with a link back to the phone step.
- **Choose username** follows the same layout, with a feed-card preview that shows your handle as you type.
- **Admin** (`/admin`, admin accounts only): a `BackHeader` with how long ago the numbers loaded and a refresh button, then stacked cards. **Today** and **Texting** are `Stat` rows with a line of detail in 12px `ink-muted`; Texting adds an accent callout when most of today's new numbers never entered their code. **Sign-up method** is a Phone / Email `Segmented` toggle that asks before switching. Below them, **Latest logs** are flat cards (handle and time, artist, `Place`, `Stars`, review) with a quiet Remove button, and **Latest sign-ups** is one flat card divided into rows with compact `Chip`s for phone or email, QR, and "No code".

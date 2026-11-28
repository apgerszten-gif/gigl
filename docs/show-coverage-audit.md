# Show coverage audit

*Written 2026-11-27, from the code and from the numbers in `CLAUDE.md`. Nothing here was measured against Ticketmaster, Supabase or setlist.fm: those keys and hosts were not available when this was written. Every size is an estimate, and every gap says how to measure it. `scripts/measure-coverage.mjs` (read-only) answers most of them in one run.*

Three independent audits (the Ticketmaster pipeline; retention and the other sources; matching and identity) were run against the code and then merged and re-checked here. Only gaps verified in the code are listed. Things `CLAUDE.md` already documents (the 1,000-result cap and month slicing, the name-and-radius double pass, the 09:00 timing budget, the setlist.fm terms) are not repeated unless they turned out to be handled incompletely.

**Status key:** ✅ fixed in this PR · 🟡 partly fixed · 📋 planned, not done (reason given)

## How a show gets missed: the short version

A show reaches Gigl only if (1) a source lists it, (2) the nightly job asks the right question and doesn't throw the answer away, (3) it is stored under one identity, and (4) search, Near me or the photo finder can find it again. The gaps below sit at each of those steps. Ranked by value over risk:

| # | Gap | Step | Status |
|---|-----|------|--------|
| 1 | No record, heartbeat or alert for the nightly syncs | 2 | ✅ |
| 2 | `sync-unclassified` throws away most of what it fetches | 2 | ✅ / 📋 |
| 3 | Evening browse list hides tonight's shows (UTC "today") | 4 | ✅ |
| 4 | Venues outside every city's name and 25-mile radius, and a wrong centroid | 1 | ✅ (sweep starts dry) |
| 5 | Cancelled and vanished Ticketmaster shows stay loggable | 3 | 🟡 |
| 6 | Photo finder samples 1,000 rows and ties at festivals | 4 | ✅ |
| 7 | The same show under two ids; no de-duplication outside Wrapped | 3 | 📋 |
| 8 | Month slices over the cap are truncated silently | 2 | ✅ |
| 9 | A support act's name finds nothing | 4 | ✅ (needs SQL) |
| 10 | Hand-added shows have no coordinates; the duplicate check is weak | 3, 4 | ✅ |
| 11 | The 366-day prune splits a show's identity | 3 | ✅ |
| 12 | One 5xx, or a hung request, drops a probe for the night | 2 | ✅ |
| 13 | Festivals are in neither Ticketmaster pass | 1 | 📋 |
| 14 | Venue sync: small list, unreadable calendars, no reconciliation | 1, 3 | 📋 |
| 15 | Search is accent- and punctuation-sensitive | 4 | 📋 |
| 16 | Silent 1,000-row truncation in log reads | 4 | 📋 |
| 17 | Rooms and genres with no source at all | 1 | 📋 |

---

## 1. No run record, heartbeat or alert for the nightly syncs ✅

**Evidence.** `sync-shows` and `sync-unclassified` only `console.log` a summary at the end (`app/api/cron/sync-shows/route.ts`, `sync-unclassified/route.ts`); only the venue sync persists a report (`lib/venues/settings.ts`). Vercel does not retry a failed cron. A 500 for a missing `CRON_SECRET`, a function killed at `maxDuration`, an expired Ticketmaster key, or `deadlineHit`/`cityErrors` are all invisible unless someone opens the Vercel log. `CLAUDE.md` calls a missed run "a permanent hole, not a stale day", so this multiplies every other gap.

The "217s / 716 requests" in the route's header equals 716 × 0.3s of gating alone: it is the *fetch* only. Upserting tens of thousands of rows (500 per batch, two GIN trigram indexes), the prune, and `fillLoggedArtistImages` (up to 40 serial Ticketmaster lookups, ~1.1s each) run after it inside the same 300s. The true total has never been recorded; the 240s fetch deadline plus an in-flight request plus the image lookups leaves little room in the worst case.

**Size.** Unknown, and that is the point. Confidence the gap exists: high.

**Fix (done).**
- `lib/shows/syncStatus.ts` writes `app_settings['sync_status_<job>']`: `{startedAt}` before any work, then `{startedAt, finishedAt, summary}`. A `startedAt` with no matching `finishedAt` is the killed-mid-run signature. No new DDL (`app_settings` already exists); a failed write is logged and never fails the run.
- `GET /api/health/sync` answers 200, or 503 when either job has not finished in 36 hours or has never recorded a run. Point a free uptime monitor at it. It reveals only job names and ages.
- `sync-shows`' summary now includes `fetchMs`, `upsertMs`, `emptyProbes`, `splitSlices`, `cappedSlices`, `cancelled`, so the 300s margin can finally be read off a real run.

**Not done.** Upserting after phase 1 as well as at the end (so a kill loses little), and concurrent upsert batches. Both change the timing profile, and `CLAUDE.md` says to re-time the sync before doing that. Do them once `fetchMs`/`upsertMs` from a real night are known. Surfacing the record on `/admin` is also left for the owner's design.

**Measure.** After deploy: `select key, value from app_settings where key like 'sync_status_%';`. Before: `select source, max(last_seen_at), count(*) filter (where last_seen_at > now() - interval '30 hours') from shows group by 1;`, and `scripts/measure-coverage.mjs` section 4 (how early each past show was first captured: any show first seen on or after its date is evidence of a late or missed run).

## 2. `sync-unclassified` throws away most of what it fetches ✅ / 📋

This pass exists because Ticketmaster files real concerts under no category. Three separate things limit it:

1. **`knownMusicVenues` truncated its own answer.** It asked for 80 venue names at once and capped the result at 1,000 rows (`lib/shows/repository.ts`). A busy room has dozens to hundreds of music rows, so 80 rooms return thousands, Postgres returns an arbitrary 1,000, and every room whose rows fell outside them was judged "not a music venue" and its uncategorised concerts dropped (counted as `notMusicRoom`). **Fixed:** 10 names per request, read page by page until a page comes back short.
2. **`NOT_A_ROOM` contained `playhouse`,** which rejects Variety Playhouse, the very Atlanta rock club `CLAUDE.md` names as the reason this pass exists (and e.g. Ridgefield Playhouse). **Fixed** with a named exception list (`MUSIC_ROOM_EXCEPTIONS`); add other music rooms there.
3. **📋 A room whose whole Ticketmaster inventory is "Undefined"** (TicketWeb partner clubs, ids starting `Z7r9`) can never qualify, because the gate requires existing `source='ticketmaster'` music rows. These are exactly the small independent rooms the pass was built for. Proposed rule: also keep an event when one of its attractions is classified Music (`TMAttraction.classifications` is already typed but not carried onto `SyncShow`). Needs a dry-run count against the live API first, because comedy clubs also carry music attractions.

Also: `MAX_PAGES = 2` with a `date,asc` sort means New York (~2,000 Undefined events, mostly one hotel's comedy room) reaches only a few months ahead. Benign for capture (rolling), but a last-minute listing can be crowded out.

**Size.** Probably the largest recoverable gap in the Ticketmaster path; unmeasured. **Measure.** Compare `notMusicRoom` in recent `[sync-unclassified] complete` logs with the next run after this deploys; count how many dropped events had a Music-classified attraction by replaying the Undefined fetch read-only.

## 3. The evening browse list hides tonight's shows ✅

**Evidence.** `searchStoredShows` bounded the browse list at UTC today (`windowEndIso()`), ordered `show_date desc`, `limit 20`, with no tie-break (`lib/shows/repository.ts`, `lib/dates.ts`). From about 5pm Pacific or 8pm Eastern UTC's "today" is already tomorrow locally. Any metro has more than 20 shows on that date, so the top 20 were arbitrary shows that haven't happened, and tonight's never appeared in the default list: in the hours people most want to log.

**Fix (done).** The Log screen sends `today=<localTodayIso()>`; the server clamps it to [UTC today − 1, UTC today] (the same rule `upcomingBounds` uses for the Upcoming tab) and uses it as the upper bound. Added an `id` tie-break so same-date rows come back in a fixed order. Not changed: `/api/shows/submit` still uses UTC today as its bound (generous, harmless).

**Measure.** `select count(*) from logged_shows where show_date > (created_at at time zone 'America/Los_Angeles')::date;` (logs made before the show's local date).

## 4. Venues outside every city's name and radius 🟡

**Evidence.** A show is fetched only if its venue's city field equals one of the 148 names, or its coordinates are within 25 miles of a centroid (`lib/ticketmaster.ts`, `lib/shows/cities.ts`). Probable misses (estimated from geography, not from Ticketmaster): Indio/Coachella (~70 mi from Riverside), The Gorge (George, WA), Bethel Woods (NY), Mohegan Sun and Foxwoods (CT), Temecula, Napa/BottleRock, Bristow VA (Jiffy Lube Live, ~31 mi from DC), The Woodlands TX. Whole mid-size markets absent include Myrtle Beach, Greensboro/Winston-Salem, Lincoln, Tallahassee, Pensacola, Fort Myers, Sarasota, Mobile, Huntsville, Shreveport, Lansing, Fort Wayne, South Bend, Cedar Rapids/Quad Cities, Peoria, Worcester, Springfield MA, Lancaster PA, Erie, Binghamton, Santa Fe, Waco, McAllen, Bakersfield, Stockton/Modesto, Ventura, Salem OR, Billings, Cheyenne, and Saskatoon, Regina, Kitchener, Kelowna, St. John's. Mexico, the UK and everywhere else are out of scope (`countryCode: 'US' | 'CA'`); setlist.fm covers older shows abroad.

**A real bug (fixed).** London, Ontario had `lng: -77.4166` (`lib/shows/cities.ts`); London is at about −81.25. Its radius pass was searching near Rochester, NY, and name-pass rows with no venue coordinates inherited that wrong fallback point. Corrected to −81.2497 (a civic centre; `CLAUDE.md` says the other cities use the median of venue coordinates, so re-measure if you want it exact).

**Also done.** A first page with `totalElements = 0` is now logged and listed in the summary (`emptyProbes`). The `cities.ts` header says a name mismatch "fails visibly", but a zero-event answer is not an error. Accented names (Montréal, Québec) are the likely silent case; **unverified**, since I could not query Ticketmaster.

**Done afterwards: `/api/cron/sync-sweep` (see `CLAUDE.md`).** It is the plan below, built: (a) and (b) as one separate job that starts in dry-run. Original plan: (a) Add 20–40 individual cities from the list above: one request each a night, trivial against the 5,000/day quota (`CLAUDE.md`). (b) A state-wide sweep as a *separate* cron (about 8 states a night, rotating, month-sliced when a state exceeds 1,000), shipped dry-run first the way the venue sync was, to catch every venue not near a named city. Neither belongs in `sync-shows` while its time budget is unmeasured (gap 1). (c) `latlong` is, to my recollection, being superseded by `geoPoint` in Ticketmaster's docs: **unverified**, check before relying on it.

**Measure (needs the Ticketmaster key).** For each `stateCode`, page weekly windows, count `totalElements`, and count ids not in `shows`; and run a 25-mile `latlong` probe around each candidate town above.

## 5. Cancelled and vanished Ticketmaster shows stay loggable 🟡

**Evidence.** The mapper never read `dates.status` (`lib/ticketmaster.ts` before this change); future rows are never deleted by design; `last_seen_at` is written every night but only `lib/savedShows.ts` reads it. A show Ticketmaster dropped before its date ages into the past week as a normal, loggable row and stays 366 days.

**Fixed.** An event whose `dates.status.code` is `cancelled`/`canceled` is no longer stored, and the nightly runs delete the row if an earlier night stored it (`deleteShowsById`, limited to `source = 'ticketmaster'`, an explicit signal rather than mere absence). Postponed and rescheduled events are kept. **Unverified:** whether Discovery returns cancelled events by default. If it does not, this does nothing and costs nothing, and the next step matters more.

**📋 Next.** Demote (not hide) rows where `source = 'ticketmaster'` and `last_seen_at < show_date − 3 days` in the past-week browse and the photo matcher, the rule `savedShows.ts` uses. Demote rather than hide, because after a missed night every show would otherwise vanish. Only worth doing once gap 1's heartbeat shows the syncs are reliable.

**Measure.** `select count(*), count(*) filter (where last_seen_at < show_date::timestamp - interval '3 days') from shows where source = 'ticketmaster' and show_date between current_date - 30 and current_date;` and `measure-coverage.mjs` section 3.

## 6. The photo finder samples and ties ✅

**Evidence.** `showsOnDate` read the whole country's night with `limit(1000)` and no order, then computed distance in JS (`lib/shows/repository.ts`, `app/api/photos/match/route.ts`). The catalogue averages ~400 shows a day (`lib/dates.ts`), so a Friday or summer Saturday can exceed 1,000 and the right room may never be loaded. Separately, festival rows import with one shared coordinate (`scripts/import-festival.mjs`), so every act on a festival day ties on distance and the slice to 5 returned whichever five sort first by id, not the one photographed.

**Fix (done).** `showsOnDateNear` filters to a bounding box in SQL (same `boundingBox` as Near me). Ties with the fifth place on distance are kept up to 12, ordered by "has a photo" then id, so the person can pick. Also corrected a stale comment that said the day before is matched too (the server matches the exact date; the phone shifts pre-5am photos, `lib/photos/exif.ts`).

**Not done.** Rows that sit exactly on a `SYNC_CITIES` centroid (Ticketmaster rows with no venue coordinates) still count as "sure" within a mile and suppress the setlist.fm lookup. Low severity.

## 7. The same show under two ids 📋

**Evidence.** Rows are keyed by id only; the schema has no uniqueness on (artist, venue, date); only the Wrapped matcher collapses twins (`app/api/wrapped/match/route.ts`). Ticketmaster re-issues ids when a show moves, VIP/package listings share an attraction, and the venue sync writes `venue-…` ids that a later `tm-…` row duplicates (its dedupe runs only on rows about to be written, `lib/venues/sync.ts`). Logs key on `artist_id`, so reviews split across two `/artist/<id>` pages and rankings count the show twice. Also in the venue sync: the cross-venue `claimed` key is `date|state|artist` with no venue, so recurring titles ("Emo Night") at several rooms keep only the first; `slug()` of a non-Latin name is empty, so two such acts on one night collide; `SUPPORT_SPLIT` has a bare `with` ("Sleeping with Sirens" → headliner "Sleeping") and a `+` rule ("Florence + the Machine").

**Why not done.** A read-time `collapseTwins()` (group by loose artist key, `nameKey(venue)`, date; prefer `tm-` with an image) is code only, but it changes what every list shows and merges early/late shows with identical names. It needs review and the SELECT below to see how common twins actually are. Retiring stale venue rows deletes data.

**Measure.** `select show_date, lower(artist), lower(venue), count(*) n, array_agg(id), array_agg(source) from shows group by 1,2,3 having count(*) > 1 order by n desc limit 200;` and, for logs already split: `select s.show_date, lower(s.artist), lower(s.venue), count(distinct l.artist_id) from shows s join logged_shows l on l.artist_id = s.id group by 1,2,3 having count(distinct l.artist_id) > 1;` (`measure-coverage.mjs` section 6 does a looser version for the next 120 days).

## 8. Month slices over the cap are truncated silently ✅

**Evidence.** The month-splitting fix in `sync-shows` never checked a *slice's* own `totalElements`. A slice over 1,000 kept its earliest 1,000 (sorted by date) and dropped the end of the month with no log line. Likely for the radius probes of New York, LA and Las Vegas in a busy month; unmeasured.

**Fix (done).** `walkWindow` reads page 0 of each slice, and if it reports more than `TM_RESULT_CAP` it splits the slice in half by days (`splitWindow`) and asks again, down to a single day, which is counted as `cappedSlices` and logged. A slice under the cap costs nothing extra, so the request count for a normal night is unchanged. The tail window (month 13 to +5 years) gets the same treatment.

## 9. A support act's name finds nothing ✅ (needs SQL)

**Evidence.** Log search matched `artist` and `venue` only (`searchStoredShows`). Support acts live in `support text[]` (Ticketmaster's attraction order isn't a billing order; festival listings put the first act as `artist` and the rest as `support`). `/artists` and Following do match support, but only by exact, case-sensitive array containment. Someone who saw the opener could not find the show, hit "Add a show", and created a twin (gap 7).

**Fix (done, in two halves).** The code runs a second query against `support_text` and merges. `support_text` is a trigger-maintained plain-text copy of `support` with a trigram index, appended at the **end of `supabase-schema.sql`** for the owner to run by hand. Until it is run the query errors once per server instance, is logged, and search carries on exactly as before.

## 10. Hand-added shows are unplaced and the duplicate check is weak ✅

**Evidence.** `insertUserShow` hard-coded `lat/lng = null`, so the DIY and house shows nothing else carries never appeared in Near me, the photo finder or Wrapped distance. The duplicate check read the whole country's date (1,000-row sample, unordered) and compared the headliner only, so it missed support acts and over-blocked a same-named act in another state.

**Fix (done).** On submit, coordinates come from the catalogue (the room's own from another show there, else its city's centre, the same fallback Ticketmaster rows get; still null if neither is known). The duplicate check is scoped to the state when known, ordered, and also compares support acts. Back-filling existing `source = 'user'` rows is a data write and is left for the owner (the same way `scripts/backfill-log-places.mjs` did for logs).

## 11. The 366-day prune splits a show's identity ✅

**Evidence.** `prunePastShows` deleted everything a year old except `source = 'user'`. A show logged as `tm-X` on day 300 is re-offered as `setlistfm-…` on day 400 (setlist.fm covers five years, ids differ), so two logs and their reviews end up on two pages.

**Fix (done).** The prune now reads a bounded batch (2,000) of expired ids, checks them against `logged_shows.artist_id` in chunks, and deletes only the rest. If the logs can't be read it deletes nothing. Retained rows are few (only shows someone logged a year late). **Licence note:** Ticketmaster's terms on how long events may be stored are unverified (see the sources table); keeping a logged row is the minimum needed for identity, and `logged_shows` already carries its own copy of the details.

## 12. A 5xx or a hung request drops a probe ✅

**Evidence.** Only HTTP 429 was retried; any 5xx or network error aborted the rest of that probe or slice for the night, and there was no request timeout, so a hung connection could hold a worker until the function's own timeout, which discards the whole collection.

**Fix (done).** `isRetryable` (429, ≥500, and "no answer") is shared by both syncs; every request has a 20s timeout and a timeout surfaces as a retryable status-0 error. The probe order is rotated by a whole number of cities each night, so if the 240s deadline ever cuts a run short the losses (Canada, the second-wave cities at the back of the list) are shared rather than falling on the same cities every night.

## 13. Festivals are in neither Ticketmaster pass 📋

The syncs request `classificationName=music` and `segmentName=Undefined`. `scripts/import-festival.mjs` notes Ticketmaster files festivals under Miscellaneous / Fairs & Festivals, which neither requests; `FESTIVALS` in `lib/festivals.ts` holds only two 2026 festivals (both past). Coachella, ACL and Bonnaroo exist only as artist names in the known-artists list. High value for a live-music app. **Not done:** the right query parameters need a live probe (segment/genre ids), and a festival needs its own modelling (one row per day, the festival as the "artist"). Measure with a `segmentName=Miscellaneous` probe per city reading `totalElements` only.

## 14. The venue sync: small list, unreadable calendars, no reconciliation 📋

Ten rooms in each of the 20 most populous cities, ranked by population rather than by how music-dense a city is (Atlanta, Boston, DC, Portland, Detroit, New Orleans and Minneapolis are not in it); calendars drawn by DICE, See Tickets or Eventbrite embeds report "No events"; its mode defaults to *dry*, so the whole source may be switched off (check `/admin`). Rows are never reconciled: a rescheduled or renamed show gets a new id and the old row stays; cancelled events are skipped, not deleted; a later `tm-` twin never retires the older `venue-` row. **Not done:** deletions need review. **Measure:** `select value->'totals' from app_settings where key = 'venue_sync_report';` and the per-venue `status`/`method` counts in `/admin/venues`.

## 15. Search is accent- and punctuation-sensitive 📋

`escapeForOrFilter` turns `, ( ) \ % _` into spaces, but it is also applied before plain `.ilike` calls (`searchArtists`, `searchVenues`, `suggestValues`), so "Tyler, The Creator", "Earth, Wind & Fire" and "Sunn O)))" cannot match their own names; `ilike '%sigur ros%'` does not match "Sigur Rós" (accent folding in `nameKey` runs in JS after the SQL filter); the known-artists merge doesn't fold `&`/`and`, a leading "The", or apostrophes, so a 0-show duplicate can be listed beside the real artist. Code-only part: a wildcard-only escaper for plain `.ilike` callers. Full fix: a trigger-maintained `artist_key` column with a trigram index (SQL). Measure: `select count(*) from shows where artist ~ '[^ -~]';`.

## 16. Silent 1,000-row truncation in log reads 📋

Supabase answers at most 1,000 rows. `readLogs` (`lib/rankings.ts`) has no limit or order, so global rankings go wrong past ~1,000 logs; `ratingsForShows`, `artistHistory`, `searchArtists` and `reviewedShows` have the same shape at various sizes. Fix: `.range()` paging, or a SQL view. The app is early, so rankings is the one that bites first. Measure: `select count(*) from logged_shows;`.

## 17. Rooms and genres with no source at all 📋

No systematic source reaches: DIY and house shows (user submissions only), college and civic free concerts, churches and community music, classical and Latin shows that Ticketmaster classes elsewhere (unverified), rooms that sell only on DICE/Eventbrite/See Tickets with no readable site calendar, non-US/CA cities, and venues on Live Nation-exclusive or AXS/Etix-only ticketing that Discovery doesn't list. The cheapest growth is the venue crawl (more rooms, chosen for music density, validated through the `/admin` dry run), then user submissions (fixed in gap 10).

---

## Candidate extra sources, and what their terms allow

Licence checks below are from search-result summaries unless marked read. **Several primary pages could not be fetched from the build environment (`musicbrainz.org`, `developer.ticketmaster.com`, `platform.seatgeek.com`, `www.eventbrite.com`, `bugs.webkit.org`), so check each before relying on a verdict.** Anything marked UNVERIFIED is from memory.

| Source | Terms for storing and showing | Coverage | Verdict |
|---|---|---|---|
| Ticketmaster Discovery (current) | A search excerpt of its terms says no caching or storing of Event Content beyond "reasonable periods" and removal on request within 24h (UNVERIFIED, not read from the primary page). Gigl keeps rows 366 days after the event. | US/CA music, strong | Keep. Read its terms and settle the retention question. |
| MusicBrainz events | Core data is CC0; supplementary data CC BY-NC-SA. Whether events are *core* was not confirmed (UNVERIFIED). | ~117k events in total (a May 2026 mirror's statistics, third party), mostly historic concerts and festivals; thin for small current shows | Optional, for historic festival lineups. Low priority. Check the licence page first. |
| setlist.fm (current) | Non-commercial only; commercial use needs permission; no copies beyond short-term caching (per `CLAUDE.md`) | Past shows | Keep within its terms. Storing the city on a person's own log is a minor grey area. |
| Bandsintown | Not usable (`CLAUDE.md`) | n/a | Skip |
| Songkick | API access is by manual approval; no confirmation it is open | Large | Skip |
| JamBase | Free tier non-commercial and tiny (a third-party listing, UNVERIFIED); storage rights depend on a paid licence | Aggregates | Defer until there is a licence |
| Eventbrite | The public event-search endpoint was retired in 2019 (via search) | None via API | No; read organiser pages through the venue crawl |
| SeatGeek | Free key with attribution; its storage and cache clauses were not seen | Overlaps Ticketmaster | Read its terms, then maybe a cross-check probe |
| DICE, Resident Advisor | No public API found; only third-party scrapers | DICE-only and underground rooms | Do not scrape. Use venue and promoter calendars (`promoter: true` in `lib/venues/list.ts`) |
| Last.fm events, Bandcamp, Spotify, Apple, Facebook Events | No useful public event API (UNVERIFIED) | n/a | Skip |
| StubHub, Vivid Seats, Viagogo | Resale marketplaces; partner-only (UNVERIFIED) | n/a | Skip |
| Wikipedia / Wikidata | CC BY-SA / CC0 (UNVERIFIED) | Festival lineups, annual | Already used by `scripts/build-festival-artists.mjs`; extend for festivals (gap 13) |
| Venue sites (JSON-LD, WordPress, Squarespace, ICS) | Public pages; robots.txt already obeyed | Independent rooms | Best growth source (gap 14) |
| User-submitted | Our own data | DIY, house, local | Keep; fixed in gap 10 |

## Housekeeping found along the way

- `CLAUDE.md` says the rate gate hands out slots 250ms apart; the code uses 300ms (`REQUEST_SPACING_MS`, after a 429 at 250). It also cites `scripts/jambase-probe.mjs`, which is not in the repo.
- One search excerpt of Ticketmaster's terms mentions 2 requests per second; the repo assumes 5/sec (paced at 3.3). UNVERIFIED either way; do not change pacing without evidence (watch for 429s in the logs).
- Four different artist-equivalence rules are in use (`nameKey` equality in submit and the photo route, `sameArtist` in the venue parser, `looseAct` plus an unbounded prefix in `/api/shows/past`, `editDistance` in Wrapped). One shared `actKey()` would stop a setlist.fm "J Cole" appearing beside a catalogue "J. Cole". The prefix rule in `/api/shows/past` has no minimum length, so a short name ("Air", "Yes") can hide a setlist.fm show on the same date. `CLAUDE.md` says Wrapped uses `closestMatch`; the code uses `editDistance` directly.

## What the owner needs to do

1. Run the new block at the **end of `supabase-schema.sql`** in the Supabase SQL editor (support-act search). Nothing breaks if you don't.
2. After the first nightly run on this deploy, `select key, value from app_settings where key like 'sync_status_%';` and read `fetchMs`, `upsertMs`, `durationMs`, `cappedSlices`, `emptyProbes`. Point an uptime monitor at `/api/health/sync`.
3. Run `node scripts/measure-coverage.mjs` (read-only) and the SELECTs above to size gaps 4, 5, 7, 14 before deciding on any of the planned changes.
4. Decide on the planned work in this order: the state-sweep cron and extra cities (4), the Music-attraction rule (2), read-time twin collapse (7), festivals (13).

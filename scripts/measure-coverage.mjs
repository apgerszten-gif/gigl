// Read-only measurements of how complete the shows catalogue is. It only
// sends GET requests to PostgREST, so it is safe against production:
//
//   node scripts/measure-coverage.mjs
//
// Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from
// .env.local (the service role key is only needed to read everything
// regardless of policies; the anon key works for the `shows` table too).
// Each section answers one question from docs/show-coverage-audit.md.

import fs from 'node:fs'

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)
    .filter(line => line.includes('=') && !line.startsWith('#'))
    .map(line => {
      const i = line.indexOf('=')
      return [line.slice(0, i).trim(), line.slice(i + 1).trim().replace(/^["']|["']$/g, '')]
    }),
)
const url = env.NEXT_PUBLIC_SUPABASE_URL
const key = env.SUPABASE_SERVICE_ROLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be in .env.local')
const headers = { apikey: key, Authorization: `Bearer ${key}` }

const iso = d => d.toISOString().slice(0, 10)
const daysFromToday = n => { const d = new Date(); d.setUTCDate(d.getUTCDate() + n); return iso(d) }

// Exact row count for a filter, without fetching the rows.
async function count(filter) {
  const res = await fetch(`${url}/rest/v1/shows?select=id&${filter}`, { method: 'HEAD', headers: { ...headers, Prefer: 'count=exact' } })
  if (!res.ok) throw new Error(`count failed (${filter}): HTTP ${res.status}`)
  return Number(res.headers.get('content-range')?.split('/')[1] ?? 0)
}

// Every row for a filter, 1,000 at a time (PostgREST's default page cap).
async function rows(select, filter) {
  const out = []
  for (let from = 0; ; from += 1000) {
    const res = await fetch(`${url}/rest/v1/shows?select=${select}&${filter}&order=id`, { headers: { ...headers, Range: `${from}-${from + 999}`, 'Range-Unit': 'items' } })
    if (!res.ok) throw new Error(`read failed (${filter}): HTTP ${res.status} ${await res.text()}`)
    const page = await res.json()
    out.push(...page)
    if (page.length < 1000) return out
  }
}

const today = daysFromToday(0)
const table = o => console.table(o)
const section = title => console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 70 - title.length))}`)

section('1. Rows by source')
const bySource = {}
for (const s of ['ticketmaster', 'venue', 'user', 'festival']) bySource[s] = await count(`source=eq.${s}`)
bySource.total = await count('id=not.is.null')
table(bySource)

section('2. Rows that never appear in a Near me search or the photo finder (no coordinates)')
table({
  nullLat: await count('lat=is.null'),
  nullLng: await count('lng=is.null'),
  noDate:  await count('show_date=is.null'),
})

section('3. Upcoming rows Ticketmaster has stopped listing (likely cancelled or moved)')
// last_seen_at is bumped by every nightly run that still sees the event. A
// future show not seen in a week was probably dropped upstream.
table({
  upcoming:              await count(`show_date=gte.${today}&source=eq.ticketmaster`),
  notSeenFor3Days:       await count(`show_date=gte.${today}&source=eq.ticketmaster&last_seen_at=lt.${daysFromToday(-3)}`),
  notSeenFor14Days:      await count(`show_date=gte.${today}&source=eq.ticketmaster&last_seen_at=lt.${daysFromToday(-14)}`),
})

section('4. How early was each past show captured? (show date minus first sight, last 30 days)')
// A past show captured the day it happened, or after, is evidence of a missed
// or late run: Ticketmaster has no past events, so those can only have been
// caught while upcoming. Zero or negative lead = captured too late to be a
// real advance capture.
const recent = await rows('show_date,created_at,source', `show_date=gte.${daysFromToday(-30)}&show_date=lt.${today}&source=in.(ticketmaster,venue)`)
const lead = { 'captured after the show': 0, 'same day': 0, '1-2 days ahead': 0, '3-7 days ahead': 0, '8+ days ahead': 0 }
for (const r of recent) {
  const days = Math.round((Date.parse(r.show_date) - Date.parse(r.created_at.slice(0, 10))) / 86_400_000)
  if (days < 0) lead['captured after the show']++
  else if (days === 0) lead['same day']++
  else if (days <= 2) lead['1-2 days ahead']++
  else if (days <= 7) lead['3-7 days ahead']++
  else lead['8+ days ahead']++
}
table(lead)

section('5. Shows per day, last 14 days (a dip is a hole)')
const perDay = {}
for (const r of recent) if (r.show_date >= daysFromToday(-14)) perDay[r.show_date] = (perDay[r.show_date] ?? 0) + 1
table(Object.fromEntries(Object.entries(perDay).sort()))

section('6. Possible duplicate shows (same date, venue and artist under different ids)')
const upcoming = await rows('id,artist,venue,city,show_date,source', `show_date=gte.${today}&show_date=lte.${daysFromToday(120)}`)
const norm = s => (s ?? '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/^the /, '').replace(/[^a-z0-9]/g, '')
const groups = new Map()
for (const r of upcoming) {
  const k = `${r.show_date}|${norm(r.venue)}|${norm(r.artist)}`
  groups.set(k, [...(groups.get(k) ?? []), r])
}
const dupes = [...groups.values()].filter(g => g.length > 1)
console.log(`${upcoming.length} shows in the next 120 days; ${dupes.length} groups appear more than once`)
for (const g of dupes.slice(0, 15)) console.log('  ', g.map(r => `${r.id} (${r.source})`).join('  =  '), '→', g[0].artist, '@', g[0].venue, g[0].show_date)

section('7. Metros whose upcoming count sits at a round cap (a sign of truncation)')
const byMetro = {}
for (const r of await rows('metro', `show_date=gte.${today}&source=eq.ticketmaster`)) byMetro[r.metro ?? '(none)'] = (byMetro[r.metro ?? '(none)'] ?? 0) + 1
table(Object.fromEntries(Object.entries(byMetro).sort((a, b) => b[1] - a[1]).slice(0, 15)))

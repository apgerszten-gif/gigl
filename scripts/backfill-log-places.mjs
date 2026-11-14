// Fills in where each logged show happened (logged_shows.city/lat/lng) for
// logs made before lib/pendingLogs.ts started saving it, so Near me on the
// Feed can place them. Re-runnable: it only touches logs with no lat yet.
//
//   node scripts/backfill-log-places.mjs [base-url]
//
// The places come from a running Gigl's /api/shows/locate (lib/shows/
// locate.ts), so the rules live in one place: `npm run dev` and pass
// nothing (http://localhost:3000), or pass https://www.gigl.space once it's
// deployed. Writes with SUPABASE_SERVICE_ROLE_KEY from .env.local, because
// the logs belong to other people. Needs the city/lat/lng columns at the
// end of supabase-schema.sql.

import fs from 'node:fs'

const base = (process.argv[2] ?? 'http://localhost:3000').replace(/\/$/, '')

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)
    .filter(line => line.includes('=') && !line.startsWith('#'))
    .map(line => {
      const i = line.indexOf('=')
      return [line.slice(0, i).trim(), line.slice(i + 1).trim().replace(/^["']|["']$/g, '')]
    }),
)
const url = env.NEXT_PUBLIC_SUPABASE_URL
const key = env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be in .env.local')
const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }

const res = await fetch(`${url}/rest/v1/logged_shows?select=artist_id&lat=is.null&limit=10000`, { headers })
if (!res.ok) throw new Error(`reading logs failed: HTTP ${res.status} ${await res.text()}`)
const showIds = [...new Set((await res.json()).map(row => row.artist_id))]
console.log(`${showIds.length} shows with unplaced logs`)

const tally = { placed: 0, unknown: 0, failed: 0 }
for (const id of showIds) {
  const answer = await fetch(`${base}/api/shows/locate?${new URLSearchParams({ id })}`)
  if (!answer.ok) { tally.failed++; console.log(`  ${id}: lookup HTTP ${answer.status}`); continue }
  const { place } = await answer.json()
  if (!place) { tally.unknown++; console.log(`  ${id}: can't be placed`); continue }

  const write = await fetch(
    `${url}/rest/v1/logged_shows?artist_id=eq.${encodeURIComponent(id)}&lat=is.null`,
    { method: 'PATCH', headers, body: JSON.stringify(place) },
  )
  if (!write.ok) { tally.failed++; console.log(`  ${id}: write HTTP ${write.status} ${await write.text()}`); continue }
  tally.placed++
}
console.log(tally)

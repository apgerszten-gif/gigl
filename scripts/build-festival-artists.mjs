// Rebuilds lib/shows/festivalArtists.ts: every act on the lineup of Coachella,
// Austin City Limits, Lollapalooza (Chicago) and Outside Lands.
//
//   node scripts/build-festival-artists.mjs
//
// Coachella, ACL and Lollapalooza come from Wikipedia's lineup pages (read
// through its API); Outside Lands from outside_lands_2026_schedule.csv in
// this folder's parent. Re-run when a new lineup is announced and update the
// page names / CSV below. Nothing here touches the database.

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const UA = { 'User-Agent': 'Gigl/0.1 (non-commercial; festival lineups)' }

// One page at a time, with a pause, and a retry when Wikipedia says slow down.
async function wikitext(page) {
  const url = 'https://en.wikipedia.org/w/api.php?action=parse&prop=wikitext&format=json&redirects=1&page=' + encodeURIComponent(page)
  for (let attempt = 0; attempt < 5; attempt++) {
    await new Promise(r => setTimeout(r, attempt === 0 ? 1500 : 15_000 * attempt))
    const res = await fetch(url, { headers: UA })
    const text = await res.text()
    try {
      const json = JSON.parse(text)
      if (!json.parse) throw new Error(`No Wikipedia page "${page}"`)
      return json.parse.wikitext['*']
    } catch (err) {
      if (!/too many requests/i.test(text) && res.status !== 429) throw err
      console.log(`  Wikipedia asked us to slow down on "${page}"; waiting`)
    }
  }
  throw new Error(`Wikipedia kept refusing "${page}"`)
}

// "[[Dev Hynes|Blood Orange]]" -> "Blood Orange"; "[[Turnstile (band)]]" ->
// "Turnstile"; "'''[[Lorde]]'''{{ref|1|[A]}}" -> "Lorde"; plain text as is.
function clean(raw) {
  let s = raw
    .replace(/<ref[\s\S]*?(<\/ref>|\/>)/g, '')
    .replace(/\{\{[^}]*\}\}/g, '')
    .replace(/'{2,}/g, '')
    .trim()
  const link = s.match(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/)
  if (link) s = link[2] ?? link[1].replace(/\s+\([^)]*\)$/, '')
  s = s.replace(/\[\[|\]\]/g, '').replace(/&amp;/g, '&').replace(/\s+\((DJ set|live)\)$/i, '').replace(/\s+/g, ' ').trim()
  return s
}

const names = (lines, pick) => lines.map(pick).filter(Boolean).map(clean).filter(n => n && n.length < 80 && !/unclear|verify|^TBA$/i.test(n))

const lists = {}

// Coachella 2026: the three-column stage tables, bulleted.
{
  const w = await wikitext('Coachella 2026')
  // The "Headline sets" boxes inside it hold numbered song lists, which the
  // bullet filter below skips.
  const body = w.slice(w.indexOf('== Lineup =='), w.indexOf('== Notable events =='))
  lists['Coachella 2026'] = names(body.split('\n'), l => (/^\s*\*/.test(l) ? l.replace(/^\s*\*+/, '') : null))
}

// Coachella 2027: only the headliners and "other artists confirmed" are
// named on Wikipedia so far (the full poster isn't), so this part is partial.
{
  const w = await wikitext('Coachella 2027')
  const section = w.slice(w.indexOf('== Lineup =='), w.indexOf('== References =='))
  const other = section.split('\n').find(l => l.startsWith('Other artists confirmed')) ?? ''
  const links = [...other.replace(/<ref[\s\S]*?<\/ref>/g, '').matchAll(/\[\[([^\]]+)\]\]/g)].map(m => m[0])
  lists['Coachella 2027 (announced so far)'] = [
    ...['Dua Lipa', 'Tame Impala', 'SZA', 'Madonna'],
    ...links.map(clean),
  ]
}

// Austin City Limits 2026: both weekends, one bulleted list each.
{
  const w = await wikitext('List of Austin City Limits lineups by year')
  const start = w.indexOf('\n== 2026 ==')
  const rest = w.slice(start + 1)
  const end = rest.slice(5).search(/\n== /)
  const body = end === -1 ? rest : rest.slice(0, end + 5)
  lists['Austin City Limits 2026'] = names(body.split('\n'), l => (/^\*/.test(l) ? l.replace(/^\*+/, '') : null))
}

// Lollapalooza Chicago 2026: the four days' |-separated lists.
{
  const w = await wikitext('List of Lollapalooza lineups by year')
  const start = w.indexOf('Lollapalooza Chicago 2026')
  const rest = w.slice(start)
  const end = rest.search(/Lollapalooza (India|Brasil|Berlin|Chile|Argentina|Paris)/)
  const body = end === -1 ? rest : rest.slice(0, end)
  lists['Lollapalooza Chicago 2026'] = names(body.split('\n').slice(1), l => (/^\|(?!\|)/.test(l) ? l.slice(1) : null))
}

// Outside Lands 2026: the schedule's artist column.
{
  const csv = readFileSync(path.join(ROOT, 'outside_lands_2026_schedule.csv'), 'utf8').split(/\r?\n/).slice(1)
  lists['Outside Lands 2026'] = csv.filter(Boolean).map(line => {
    const cols = line.match(/("([^"]|"")*"|[^,]*)(,|$)/g).map(c => c.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"'))
    return cols[3]?.trim().replace(/\s+\((DJ set|live)\)$/i, '')
  }).filter(n => n && !/unclear|verify/i.test(n))
}

for (const [festival, list] of Object.entries(lists)) console.log(festival.padEnd(36), list.length)

const body = Object.entries(lists).map(([festival, list]) =>
  `  // ${festival}: ${list.length} acts\n` + list.map(n => `  ${JSON.stringify(n)},`).join('\n')).join('\n')

writeFileSync(path.join(ROOT, 'lib/shows/festivalArtists.ts'), `// Every act on the lineups of Coachella, Austin City Limits, Lollapalooza
// (Chicago) and Outside Lands, built by scripts/build-festival-artists.mjs
// (read ${new Date().toISOString().slice(0, 10)}). Like topArtists.ts, these are always
// searchable, whether or not the catalogue has a show for them; see
// knownArtists.ts, which merges the two. Names only, as the festivals print
// them. Some names repeat across festivals and are merged there.
export const FESTIVAL_ARTISTS: readonly string[] = [
${body}
]
`)

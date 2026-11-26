import { nameKey } from '../nameKey'
import { TOP_ARTISTS } from './topArtists'
import { FESTIVAL_ARTISTS } from './festivalArtists'

// Every artist that's always an option in search and in the Wrapped matcher,
// whether or not the catalogue has a show for them: the 1,000 most-streamed
// (topArtists.ts) and everyone on the Coachella, Austin City Limits,
// Lollapalooza and Outside Lands lineups (festivalArtists.ts). One spelling
// per artist, the first listed, so the streaming list's wins.
export const KNOWN_ARTISTS: readonly string[] = (() => {
  const seen = new Set<string>()
  const out: string[] = []
  for (const name of [...TOP_ARTISTS, ...FESTIVAL_ARTISTS]) {
    const key = nameKey(name)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(name)
  }
  return out
})()

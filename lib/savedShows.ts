import { createClient } from './supabase/client'
import { localTodayIso } from './dates'

// Shows someone plans to go to, and the review prompt once one has passed.
//
// A saved row keeps its own artist, venue and date, the way logged_shows does,
// because catalogue rows can change and are eventually pruned. The catalogue
// is still read on each load (see loadSavedShows), since it's what knows a
// show has moved.

export interface SavableShow {
  id:        string
  artist:    string
  venue:     string
  city:      string
  state:     string
  isoDate:   string | null
  imageUrl?: string | null
}

export interface SavedShow {
  id:        string
  show_id:   string
  artist:    string
  venue:     string
  city:      string
  state:     string
  show_date: string
  image_url: string | null
}

// A Ticketmaster listing the nightly sync stopped seeing this long before the
// show's date has most likely been cancelled, so nobody should be asked how
// it was. Only Ticketmaster rows: a venue's site or a hand-added show has no
// such rhythm of being re-seen.
const CANCELLED_AFTER_DAYS = 3

function daysBetween(fromIso: string, toIso: string): number {
  return (Date.parse(toIso.slice(0, 10)) - Date.parse(fromIso.slice(0, 10))) / 86_400_000
}

export async function fetchSavedShowIds(userId: string): Promise<Set<string>> {
  const { data, error } = await createClient().from('saved_shows').select('show_id').eq('user_id', userId)
  if (error) throw new Error(error.message)
  return new Set((data ?? []).map(row => row.show_id as string))
}

// `textOptIn` is the moment's answer to the checkbox beside the list. It's
// stored per save, with its time, as the record of that consent.
export async function saveShow(userId: string, show: SavableShow, textOptIn: boolean): Promise<void> {
  if (!show.isoDate) throw new Error('A show with no date cannot be saved.')
  const { error } = await createClient().from('saved_shows').upsert({
    user_id:        userId,
    show_id:        show.id,
    artist:         show.artist,
    venue:          show.venue,
    city:           show.city,
    state:          show.state,
    show_date:      show.isoDate,
    image_url:      show.imageUrl ?? null,
    text_opt_in_at: textOptIn ? new Date().toISOString() : null,
    dismissed_at:   null,
  }, { onConflict: 'user_id,show_id' })
  if (error) throw new Error(error.message)
}

export async function unsaveShow(userId: string, showId: string): Promise<void> {
  const { error } = await createClient().from('saved_shows').delete().eq('user_id', userId).eq('show_id', showId)
  if (error) throw new Error(error.message)
}

export async function dismissReminder(id: string): Promise<void> {
  const { error } = await createClient().from('saved_shows').update({ dismissed_at: new Date().toISOString() }).eq('id', id)
  if (error) throw new Error(error.message)
}

// Everything still open: `upcoming` for the profile's list, soonest first, and
// `due` for the Feed's review prompt, most recent first. A show drops out of
// both once it's been logged or dismissed, so logging is what ends a reminder
// and there's no state to keep in step. logged_shows.artist_id holds the same
// catalogue id as show_id.
export async function loadSavedShows(userId: string): Promise<{ upcoming: SavedShow[]; due: SavedShow[] }> {
  const supabase = createClient()

  const { data: saved, error } = await supabase
    .from('saved_shows')
    .select('id, show_id, artist, venue, city, state, show_date, image_url')
    .eq('user_id', userId)
    .is('dismissed_at', null)
    .order('show_date', { ascending: true })
  if (error) throw new Error(error.message)
  if (!saved || saved.length === 0) return { upcoming: [], due: [] }

  const ids = saved.map(row => row.show_id)
  const [{ data: logged }, { data: catalogue }] = await Promise.all([
    supabase.from('logged_shows').select('artist_id').eq('user_id', userId).in('artist_id', ids),
    supabase.from('shows').select('id, show_date, last_seen_at').in('id', ids),
  ])
  const loggedIds = new Set((logged ?? []).map(row => row.artist_id))
  const listings = new Map((catalogue ?? []).map(row => [row.id, row]))

  const today = localTodayIso()
  const upcoming: SavedShow[] = []
  const due: SavedShow[] = []

  for (const row of saved as SavedShow[]) {
    if (loggedIds.has(row.show_id)) continue

    const listing = listings.get(row.show_id)
    let show = row
    if (listing?.show_date && listing.show_date !== row.show_date) {
      // Rescheduled. Best-effort: if this write fails, the next load repeats it.
      show = { ...row, show_date: listing.show_date }
      supabase.from('saved_shows').update({ show_date: listing.show_date }).eq('id', row.id).then(({ error: moveError }) => {
        if (moveError) console.error('saved show date update failed:', moveError.message)
      })
    }

    if (show.show_date >= today) { upcoming.push(show); continue }

    const vanished = show.show_id.startsWith('tm-') && listing?.last_seen_at
      && daysBetween(listing.last_seen_at, show.show_date) > CANCELLED_AFTER_DAYS
    if (!vanished) due.push(show)
  }

  upcoming.sort((a, b) => a.show_date.localeCompare(b.show_date))
  due.sort((a, b) => b.show_date.localeCompare(a.show_date))
  return { upcoming, due }
}

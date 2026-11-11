'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { LOCAL_STORAGE_KEY } from '@/lib/festivals'
import { setActiveShow } from '@/lib/activeShow'

export interface LoggableShow {
  id:       string
  artist:   string
  venue:    string
  city:     string
  state:    string
  isoDate:  string | null
  imageUrl: string | null
}

// Starts logging one fully-specified show, from any list of them: the Log
// screen, the Feed's search, an artist or venue page. Returns the function a
// row's "+ Log" calls.
export function useStartLogging(): (show: LoggableShow) => void {
  const router = useRouter()
  const { user } = useAuth()

  return show => {
    localStorage.setItem(LOCAL_STORAGE_KEY, show.id)

    // Every listed show is a single fully-specified one, from the catalogue
    // or from setlist.fm, never a bare festival id. Persisted separately from
    // LOCAL_STORAGE_KEY (which only holds the id) so /log can pull the
    // artist/venue/date back out without re-fetching - see lib/activeShow.
    setActiveShow({ id: show.id, artist: show.artist, venue: show.venue, city: show.city, state: show.state, isoDate: show.isoDate, imageUrl: show.imageUrl })

    // Best-effort, fire-and-forget — this is only needed so the SMS webhook
    // (which has no access to a browser's localStorage) knows which show
    // to match artist names against. The in-app UI never depends on this
    // write completing.
    // NOTE: active_festival_id is a holdover column name from the
    // festival-only model — it's being repurposed here to hold whichever
    // show id the person picked. Renaming it is a backend follow-up.
    if (user) {
      createClient().from('profiles').update({ active_festival_id: show.id }).eq('id', user.id).then(({ error }) => {
        if (error) console.error('active_festival_id update failed:', error.message)
      })
    }

    // /log already knows how to take a fully-specified active show (set
    // above) straight into /log-show, skipping the festival lineup picker
    // entirely - see app/log/page.tsx.
    router.push('/log')
  }
}

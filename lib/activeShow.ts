// Full details of a Ticketmaster-sourced show the user picked on
// select-festival, persisted so /log can hand off straight into log-show
// without a lineup to pick from (a Ticketmaster show is already fully
// specified - there's nothing left to choose). A real festival pick needs
// none of this: it's represented purely by LOCAL_STORAGE_KEY resolving via
// getFestival(), which is how /log tells the two apart.
export interface ActiveShow {
  id:      string // tm-{eventId} - matches whatever LOCAL_STORAGE_KEY holds when this is set
  artist:  string
  venue:   string
  city:    string
  state:   string
  isoDate: string | null
}

const ACTIVE_SHOW_KEY = 'gigl_active_show'

export function setActiveShow(show: ActiveShow): void {
  localStorage.setItem(ACTIVE_SHOW_KEY, JSON.stringify(show))
}

export function getActiveShow(): ActiveShow | null {
  try {
    const raw = localStorage.getItem(ACTIVE_SHOW_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

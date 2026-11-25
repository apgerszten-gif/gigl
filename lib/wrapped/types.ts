// Shapes shared by the Wrapped flow (components/wrapped/) and its two API
// routes: /api/wrapped/read turns screenshots into names, /api/wrapped/match
// turns names into Gigl's shows.

// Which Wrapped card a screenshot is of. The upload sheet has a slot for each.
export type WrappedCard = 'artists' | 'songs'

export interface WrappedImage {
  card:      WrappedCard
  // Base64 JPEG, without the data: prefix. Resized on the phone first
  // (lib/wrapped/image.ts), so it's a few hundred KB.
  data:      string
}

// What the screenshots said, in Wrapped's own order.
export interface ReadResult {
  // The Top artists card, most played first.
  artists:      string[]
  // Everyone credited on the Top songs card, in song order, without repeats.
  songArtists:  string[]
  // Neither picture looked like a Wrapped card at all.
  notWrapped:   boolean
}

export interface WrappedName {
  name: string
  from: WrappedCard
}

// One artist after matching against Gigl's catalogue.
export interface WrappedArtist {
  // As read off the screenshot.
  read:      string
  // The spelling Gigl's shows use, or `read` when there's no match.
  name:      string
  from:      WrappedCard
  // Place in the combined list: Top artists first, then Top songs.
  rank:      number
  // Gigl has shows under this name.
  matched:   boolean
  // The name was corrected to Gigl's spelling ("Fontains DC" -> "Fontaines D.C.").
  corrected: boolean
  imageUrl:  string | null
}

export interface WrappedShow {
  id:        string
  artist:    string
  support?:  string[]
  venue:     string
  city:      string
  state:     string
  isoDate:   string | null
  imageUrl:  string | null
  // From where the person is, when the flow knows that.
  distanceMiles?: number
  // Which of their Wrapped artists this show is for (WrappedArtist.name).
  wrappedArtist: string
}

export interface MatchResult {
  artists:  WrappedArtist[]
  // Soonest first.
  upcoming: WrappedShow[]
  // The catalogue's past year, newest first.
  past:     WrappedShow[]
}

// The funnel steps the admin page counts (site_events kind 'wrapped').
export const WRAPPED_STEPS = ['seen', 'added', 'logged', 'signed_up'] as const
export type WrappedStep = typeof WRAPPED_STEPS[number]

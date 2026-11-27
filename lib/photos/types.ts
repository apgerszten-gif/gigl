// Shapes shared by the photo finder (components/photos/) and /api/photos/read.

export interface PhotoInput {
  // Base64 JPEG, resized on the phone first (lib/wrapped/image.ts).
  data:    string
  // From the file's EXIF, when it had any (lib/photos/exif.ts).
  takenOn: string | null
  lat:     number | null
  lng:     number | null
}

// What the picture itself said.
export interface PhotoRead {
  // Which picture, by position in the request.
  index:    number
  artists:  string[]
  venue:    string | null
  city:     string | null
  // YYYY-MM-DD printed in the picture (a ticket, a post), else null.
  date:     string | null
}

// A show Gigl has that a photo points to.
export interface PhotoShow {
  id:       string
  artist:   string
  support?: string[]
  venue:    string
  city:     string
  state:    string
  isoDate:  string | null
  imageUrl: string | null
  // Positions of the pictures that pointed here.
  photos:   number[]
  // Why it's offered: 'date' means the show matched the day the photo was taken.
  why:      'artist and date' | 'artist' | 'date and place'
}

export interface PhotoResult {
  reads: PhotoRead[]
  shows: PhotoShow[]
}

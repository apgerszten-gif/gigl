// Shapes shared by the photo finder (components/photos/) and /api/photos/match.

// Photos taken on one night in one place, worked out on the phone from the
// pictures' EXIF (lib/photos/exif.ts, components/photos/cluster.ts). Only
// this goes to the server, never a picture.
export interface PhotoCluster {
  // YYYY-MM-DD
  date:  string
  // Rounded to 2 decimals.
  lat:   number
  lng:   number
  count: number
}

// A show Gigl has that a cluster of photos was taken at.
export interface PhotoShow {
  id:       string
  artist:   string
  support?: string[]
  venue:    string
  city:     string
  state:    string
  isoDate:  string | null
  imageUrl: string | null
  // Index of the cluster it was matched to (position in the request).
  cluster:  number
  distanceMiles: number
}

export interface PhotoMatchResult {
  shows: PhotoShow[]
}

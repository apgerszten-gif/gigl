import { distanceInMiles } from '@/lib/geo'
import type { PhotoMeta } from '@/lib/photos/exif'

// Photos from one night in one place, grouped on the phone. A show is a few
// hours in one room, so photos on the same date within CLUSTER_MILES of each
// other are one visit; the files are kept so the results can show a few.

const CLUSTER_MILES = 1.5

export interface PhotoFile {
  file: File
  meta: PhotoMeta
}

export interface Cluster {
  date:   string
  lat:    number
  lng:    number
  photos: PhotoFile[]
}

export interface Grouped {
  clusters: Cluster[]
  // Photos with a date and a place, a date only, or neither.
  located:  number
  dateOnly: number
  bare:     number
}

export function groupPhotos(photos: PhotoFile[]): Grouped {
  const clusters: Cluster[] = []
  let dateOnly = 0
  let bare = 0
  let located = 0

  for (const photo of photos) {
    const { takenOn, lat, lng } = photo.meta
    if (!takenOn) { bare += 1; continue }
    if (lat == null || lng == null) { dateOnly += 1; continue }
    located += 1

    const home = clusters.find(c => c.date === takenOn && distanceInMiles({ lat: c.lat, lng: c.lng }, { lat, lng }) <= CLUSTER_MILES)
    if (home) {
      // Keep the centre as the average of what's in it.
      const n = home.photos.length
      home.lat = (home.lat * n + lat) / (n + 1)
      home.lng = (home.lng * n + lng) / (n + 1)
      home.photos.push(photo)
    } else {
      clusters.push({ date: takenOn, lat, lng, photos: [photo] })
    }
  }

  clusters.sort((a, b) => b.date.localeCompare(a.date) || b.photos.length - a.photos.length)
  return { clusters, located, dateOnly, bare }
}

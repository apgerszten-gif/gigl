'use client'

// When and where a photo was taken, read in the browser from the file's own
// EXIF block. Nothing is uploaded: only the date and a place rounded to two
// decimals (about a kilometre) go to /api/photos/match, never the picture.
// JPEG, and HEIC (the iPhone's own format), carry it; screenshots don't.

export interface PhotoMeta {
  // YYYY-MM-DD, as the camera's clock saw it.
  takenOn: string | null
  lat:     number | null
  lng:     number | null
}

const EMPTY: PhotoMeta = { takenOn: null, lat: null, lng: null }

export async function readPhotoMeta(file: File): Promise<PhotoMeta> {
  try {
    // EXIF sits near the start of a JPEG; a HEIC can keep it a little further in.
    const buffer = await file.slice(0, 1024 * 1024).arrayBuffer()
    const view = new DataView(buffer)
    if (view.byteLength > 12 && view.getUint16(0) === 0xffd8) return parseJpeg(view)
    return parseContainer(view)
  } catch {
    return EMPTY
  }
}

function parseJpeg(view: DataView): PhotoMeta {
  let offset = 2
  while (offset + 4 < view.byteLength) {
    if (view.getUint8(offset) !== 0xff) return EMPTY
    const marker = view.getUint8(offset + 1)
    const size = view.getUint16(offset + 2)
    if (marker === 0xe1 && view.getUint32(offset + 4) === 0x45786966) { // "Exif"
      return parseTiff(view, offset + 10)
    }
    if (marker === 0xda) return EMPTY // start of the picture: no EXIF
    offset += 2 + size
  }
  return EMPTY
}

// HEIC: find "Exif\0\0" followed by a TIFF header.
function parseContainer(view: DataView): PhotoMeta {
  for (let i = 0; i + 12 < view.byteLength; i++) {
    if (view.getUint32(i) !== 0x45786966 || view.getUint16(i + 4) !== 0) continue
    const order = view.getUint16(i + 6)
    if (order === 0x4d4d || order === 0x4949) return parseTiff(view, i + 6)
  }
  return EMPTY
}

function parseTiff(view: DataView, start: number): PhotoMeta {
  const little = view.getUint16(start) === 0x4949
  const u16 = (o: number) => view.getUint16(o, little)
  const u32 = (o: number) => view.getUint32(o, little)

  // Entries of one IFD, by tag, as the offset of each 12-byte entry.
  const entries = (ifd: number): Map<number, number> => {
    const out = new Map<number, number>()
    const at = start + ifd
    if (at + 2 > view.byteLength) return out
    const count = u16(at)
    for (let i = 0; i < count; i++) {
      const entry = at + 2 + i * 12
      if (entry + 12 > view.byteLength) break
      out.set(u16(entry), entry)
    }
    return out
  }

  const ascii = (entry: number): string => {
    const length = u32(entry + 4)
    const at = length <= 4 ? entry + 8 : start + u32(entry + 8)
    let text = ''
    for (let i = 0; i < length - 1 && at + i < view.byteLength; i++) text += String.fromCharCode(view.getUint8(at + i))
    return text
  }

  const rationals = (entry: number, n: number): number[] => {
    const at = start + u32(entry + 8)
    const out: number[] = []
    for (let i = 0; i < n; i++) {
      const denominator = u32(at + i * 8 + 4)
      out.push(denominator ? u32(at + i * 8) / denominator : 0)
    }
    return out
  }

  const root = entries(u32(start + 4))
  const meta: PhotoMeta = { takenOn: null, lat: null, lng: null }

  const exifPointer = root.get(0x8769)
  const taken = exifPointer ? entries(u32(exifPointer + 8)).get(0x9003) : undefined
  const modified = root.get(0x0132)
  const stamp = taken ? ascii(taken) : modified ? ascii(modified) : ''
  const date = /^(\d{4}):(\d{2}):(\d{2})/.exec(stamp)
  if (date && date[1] !== '0000') meta.takenOn = `${date[1]}-${date[2]}-${date[3]}`

  const gpsPointer = root.get(0x8825)
  if (gpsPointer) {
    const gps = entries(u32(gpsPointer + 8))
    const latRef = gps.get(1), lat = gps.get(2), lngRef = gps.get(3), lng = gps.get(4)
    if (latRef && lat && lngRef && lng) {
      const [d1, m1, s1] = rationals(lat, 3)
      const [d2, m2, s2] = rationals(lng, 3)
      const latitude = (d1 + m1 / 60 + s1 / 3600) * (ascii(latRef).startsWith('S') ? -1 : 1)
      const longitude = (d2 + m2 / 60 + s2 / 3600) * (ascii(lngRef).startsWith('W') ? -1 : 1)
      if (Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180 && (latitude !== 0 || longitude !== 0)) {
        meta.lat = Math.round(latitude * 100) / 100
        meta.lng = Math.round(longitude * 100) / 100
      }
    }
  }
  return meta
}

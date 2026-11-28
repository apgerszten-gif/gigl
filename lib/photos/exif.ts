'use client'

// When and where a photo was taken, read in the browser from the file's own
// EXIF block. Nothing is uploaded: only the date and a place rounded to two
// decimals (about a kilometre) go to /api/photos/match, never the picture.
// JPEG, and HEIC (the iPhone's own format), carry it; screenshots don't.

export interface PhotoMeta {
  // YYYY-MM-DD, as the camera's clock saw it, the night before for a photo
  // taken before 5am.
  takenOn: string | null
  lat:     number | null
  lng:     number | null
}

const EMPTY: PhotoMeta = { takenOn: null, lat: null, lng: null }

// What one read cost, for the timing panel (lib/photos/timing.ts) and so a
// photo that can't be read is counted rather than stalling the batch.
export interface PhotoRead {
  meta:   PhotoMeta
  ms:     number
  // Bytes actually pulled off the file, which is the point of reading only a
  // slice: it was 3 MB per photo before, and is typically 64 KB now.
  bytes:  number
  kind:   'jpeg' | 'heic' | 'other'
  failed: boolean
  timedOut: boolean
}

// Where EXIF can live, and how much of the file to read to find it.
//
//  - JPEG: the Exif block is one APP1 segment (at most 64 KB) near the start.
//    HEAD_BYTES covers it in nearly every file; a rare file with something
//    large ahead of it gets one further, exact read.
//  - HEIC/HEIF (the iPhone's own format): an ISO box file. The `meta` box at
//    the start says where the Exif item is (`iinf` names it, `iloc` locates
//    it), so the answer is that few-kilobyte item, not a scan through
//    megabytes looking for the letters "Exif".
//  - Anything else (PNG, screenshots): carries no usable location, so it is
//    not read beyond the first slice.
const HEAD_BYTES  = 64 * 1024
const MAX_BOX     = 2 * 1024 * 1024  // a meta box or JPEG preamble bigger than this isn't worth chasing
// A read that hasn't finished by now is not going to. iOS and Android hand
// the page files the phone is still preparing, and one that stalls must not
// hold the other photos' results hostage.
const READ_TIMEOUT_MS = 12_000

export async function readPhotoMeta(file: File): Promise<PhotoMeta> {
  return (await readPhoto(file)).meta
}

export async function readPhoto(file: File): Promise<PhotoRead> {
  const started = performance.now()
  const result: PhotoRead = { meta: EMPTY, ms: 0, bytes: 0, kind: 'other', failed: false, timedOut: false }

  const work = (async () => {
    const read = async (from: number, to: number) => {
      const buffer = await file.slice(from, to).arrayBuffer()
      result.bytes += buffer.byteLength
      return buffer
    }
    const head = new DataView(await read(0, HEAD_BYTES))

    if (head.byteLength > 12 && head.getUint16(0) === 0xffd8) {
      result.kind = 'jpeg'
      result.meta = await readJpeg(head, read)
    } else if (head.byteLength > 12 && head.getUint32(4) === 0x66747970) { // "ftyp"
      result.kind = 'heic'
      result.meta = await readHeic(head, read)
    }
  })()

  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<'timeout'>(resolve => { timer = setTimeout(() => resolve('timeout'), READ_TIMEOUT_MS) })
  try {
    const outcome = await Promise.race([work.then(() => 'done' as const), timeout])
    if (outcome === 'timeout') { result.timedOut = true; result.failed = true; work.catch(() => {}) }
  } catch {
    result.failed = true
  } finally {
    clearTimeout(timer)
  }
  result.ms = Math.round(performance.now() - started)
  return result
}

type Read = (from: number, to: number) => Promise<ArrayBuffer>

async function readJpeg(head: DataView, read: Read): Promise<PhotoMeta> {
  let offset = 2
  // Segments are walked through the slice already in hand; only when the one
  // wanted runs past the end of it is another read made.
  while (offset + 4 < head.byteLength) {
    if (head.getUint8(offset) !== 0xff) return EMPTY
    const marker = head.getUint8(offset + 1)
    if (marker === 0xda) return EMPTY // start of the picture: no EXIF
    const size = head.getUint16(offset + 2)
    if (marker === 0xe1 && head.getUint32(offset + 4) === 0x45786966) { // "Exif"
      const end = offset + 2 + size
      if (end <= head.byteLength) return parseTiff(head, offset + 10)
      if (end > MAX_BOX) return EMPTY
      return parseTiff(new DataView(await read(0, end)), offset + 10)
    }
    offset += 2 + size
  }
  // The slice ended before the Exif block started (a large segment ahead of
  // it). Take a bigger look, once.
  if (head.byteLength === HEAD_BYTES) {
    const more = new DataView(await read(0, MAX_BOX))
    return more.byteLength > head.byteLength ? readJpeg(more, read) : EMPTY
  }
  return EMPTY
}

const fourcc = (view: DataView, at: number) => String.fromCharCode(view.getUint8(at), view.getUint8(at + 1), view.getUint8(at + 2), view.getUint8(at + 3))

// Big-endian unsigned integer of `size` bytes (0 to 8; sizes above 4 are fine
// for the file offsets of a photo).
function uint(view: DataView, at: number, size: number): number {
  let n = 0
  for (let i = 0; i < size; i++) n = n * 256 + view.getUint8(at + i)
  return n
}

async function readHeic(head: DataView, read: Read): Promise<PhotoMeta> {
  // Top-level boxes, to the `meta` box.
  let offset = 0
  let metaStart = -1
  let metaSize = 0
  while (offset + 8 <= head.byteLength) {
    const size = head.getUint32(offset)
    const type = fourcc(head, offset + 4)
    if (type === 'meta') { metaStart = offset; metaSize = size; break }
    if (size < 8) break  // 0 (to end of file) and 1 (64-bit size) don't occur ahead of meta in a photo
    offset += size
  }
  if (metaStart < 0 || metaSize < 16 || metaSize > MAX_BOX) return legacyScan(head)

  const metaEnd = metaStart + metaSize
  const meta = metaEnd <= head.byteLength ? head : new DataView(await read(0, metaEnd))
  if (meta.byteLength < metaEnd) return legacyScan(head)

  // meta is a full box (4 bytes of version and flags), then child boxes.
  let exifItem = -1
  let iloc = -1
  let child = metaStart + 12
  while (child + 8 <= metaEnd) {
    const size = meta.getUint32(child)
    const type = fourcc(meta, child + 4)
    if (size < 8 || child + size > metaEnd) break
    if (type === 'iinf') exifItem = findExifItem(meta, child, child + size)
    else if (type === 'iloc') iloc = child
    child += size
  }
  if (exifItem < 0 || iloc < 0) return legacyScan(head)

  const place = findItemExtent(meta, iloc, exifItem)
  if (!place || place.length < 12 || place.length > MAX_BOX) return legacyScan(head)

  // The item is a 4-byte offset to the TIFF header (counted from just after
  // those 4 bytes), then the Exif data.
  const item = new DataView(await read(place.offset, place.offset + place.length))
  if (item.byteLength < 12) return legacyScan(head)
  const tiff = 4 + item.getUint32(0)
  const order = tiff + 2 <= item.byteLength ? item.getUint16(tiff) : 0
  if (order !== 0x4d4d && order !== 0x4949) return legacyScan(head)
  return parseTiff(item, tiff)
}

// `iinf` lists the items; the one whose type is "Exif" is the EXIF block.
function findExifItem(view: DataView, start: number, end: number): number {
  const version = view.getUint8(start + 8)
  let at = start + 12 + (version === 0 ? 2 : 4) // past the entry count
  while (at + 12 <= end) {
    const size = view.getUint32(at)
    if (size < 12 || at + size > end) return -1
    if (fourcc(view, at + 4) === 'infe') {
      const v = view.getUint8(at + 8)
      if (v >= 2) {
        const idSize = v === 2 ? 2 : 4
        const id = uint(view, at + 12, idSize)
        if (fourcc(view, at + 12 + idSize + 2) === 'Exif') return id
      }
    }
    at += size
  }
  return -1
}

// `iloc` says where each item's bytes are in the file.
function findItemExtent(view: DataView, start: number, itemId: number): { offset: number; length: number } | null {
  const version = view.getUint8(start + 8)
  let at = start + 12
  const offsetSize = view.getUint8(at) >> 4
  const lengthSize = view.getUint8(at) & 0x0f
  const baseSize   = view.getUint8(at + 1) >> 4
  const indexSize  = version === 1 || version === 2 ? view.getUint8(at + 1) & 0x0f : 0
  at += 2
  let count: number
  if (version < 2) { count = view.getUint16(at); at += 2 } else { count = view.getUint32(at); at += 4 }

  for (let i = 0; i < count; i++) {
    let id: number
    if (version < 2) { id = view.getUint16(at); at += 2 } else { id = view.getUint32(at); at += 4 }
    let method = 0
    if (version === 1 || version === 2) { method = view.getUint16(at) & 0x0f; at += 2 }
    at += 2 // data_reference_index
    const base = uint(view, at, baseSize); at += baseSize
    const extents = view.getUint16(at); at += 2
    let first: { offset: number; length: number } | null = null
    for (let e = 0; e < extents; e++) {
      if (indexSize > 0) at += indexSize
      const eo = uint(view, at, offsetSize); at += offsetSize
      const el = uint(view, at, lengthSize); at += lengthSize
      if (!first) first = { offset: base + eo, length: el }
    }
    // construction_method 0 = an offset in the file; 1 (idat) isn't used for a photo's Exif.
    if (id === itemId) return method === 0 ? first : null
  }
  return null
}

// The old way, for a HEIC whose boxes couldn't be followed: look for the
// letters "Exif" and a TIFF header in what has been read. Bounded to the
// first slice now, not 3 MB.
function legacyScan(view: DataView): PhotoMeta {
  return parseContainer(view)
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
  const date = /^(\d{4}):(\d{2}):(\d{2})(?: (\d{2}))?/.exec(stamp)
  if (date && date[1] !== '0000') {
    // A photo from the small hours is the end of the night before: the
    // show is dated the evening it started.
    const day = new Date(Date.UTC(Number(date[1]), Number(date[2]) - 1, Number(date[3]) - (Number(date[4] ?? 12) < 5 ? 1 : 0)))
    if (!Number.isNaN(day.getTime())) meta.takenOn = day.toISOString().slice(0, 10)
  }

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

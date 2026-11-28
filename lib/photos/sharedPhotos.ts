'use client'

// Photos shared to Gigl from another Android app (Web Share Target; see
// public/sw.js, which receives them and keeps the start of each in the Cache
// API). Taking them out here deletes them from the cache, so nothing lingers.
//
// What comes back are files cut to their first 2 MB: enough for the date and
// place in the EXIF (lib/photos/exif.ts reads a few kilobytes), not enough to
// show as a picture. That is deliberate. It keeps a hundred shared photos
// from sitting in storage as a hundred full-size files, and the page's small
// thumbnails simply leave out any the browser can't draw from the part.

export const SHARED_CACHE = 'gigl-shared-photos-v1'

export async function takeSharedPhotos(): Promise<File[]> {
  if (typeof caches === 'undefined') return []
  try {
    if (!(await caches.has(SHARED_CACHE))) return []
    const cache = await caches.open(SHARED_CACHE)
    const requests = (await cache.keys())
      .map(request => ({ request, n: Number(/\/(\d+)$/.exec(new URL(request.url).pathname)?.[1] ?? NaN) }))
      .filter(entry => Number.isFinite(entry.n))
      .sort((a, b) => a.n - b.n)

    const files: File[] = []
    for (const { request } of requests) {
      const response = await cache.match(request)
      if (!response) continue
      const blob = await response.blob()
      files.push(new File([blob], decodeURIComponent(response.headers.get('X-Photo-Name') ?? 'photo'), {
        type: response.headers.get('Content-Type') ?? blob.type,
        lastModified: Number(response.headers.get('X-Photo-Modified')) || Date.now(),
      }))
    }
    return files
  } catch (err) {
    console.error('[photos] reading the shared photos failed:', err)
    return []
  } finally {
    try { await caches.delete(SHARED_CACHE) } catch { /* nothing to clean up */ }
  }
}

// A FileList made from files, so the shared photos go through exactly the
// same code as the ones chosen in the picker. Null where the browser can't
// build one (it can in Chrome on Android, which is the only place photos are
// shared from).
export function toFileList(files: File[]): FileList | null {
  try {
    const transfer = new DataTransfer()
    files.forEach(file => transfer.items.add(file))
    return transfer.files
  } catch {
    return null
  }
}

// Gigl's service worker. It does exactly one thing: receive photos shared to
// Gigl from another Android app (the Web Share Target in manifest.json), so
// they can be read on the phone without ever being uploaded.
//
// Every other request is left alone: there is no fetch caching, no offline
// page and nothing that can change how the rest of the site loads. If this
// file is ever removed the site works as it did before; only sharing to Gigl
// stops.
//
// Share flow (components/photos/PhotoFinder.tsx picks it up):
//   1. Google Photos (or Files, the gallery...) POSTs the chosen photos,
//      multipart, to /photos/share.
//   2. This worker answers that POST itself. The photos never leave the phone:
//      the request is handled here and no network request is made.
//   3. For each photo it keeps only the start of the file, which is all the
//      finder reads (the date and place are in the first kilobytes), in the
//      Cache API under SHARED_CACHE.
//   4. It redirects to /photos?shared=<count>, where the page takes the
//      photos out of the cache, deletes them from it, and runs the same
//      finder as "Choose photos".
//
// If this worker isn't in control yet (the very first load after installing),
// the POST reaches app/photos/share/route.ts instead, which discards it.

const SHARED_CACHE = 'gigl-shared-photos-v1'
const KEEP_BYTES = 2 * 1024 * 1024

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()))

self.addEventListener('fetch', event => {
  const request = event.request
  if (request.method !== 'POST') return
  if (new URL(request.url).pathname !== '/photos/share') return
  event.respondWith(receive(request))
})

async function receive(request) {
  const to = count => Response.redirect(new URL(`/photos?shared=${count}`, self.location.origin).href, 303)
  try {
    const form = await request.formData()
    const photos = form.getAll('photos').filter(item => typeof item !== 'string')

    // A new share replaces whatever an earlier one left behind.
    await caches.delete(SHARED_CACHE)
    if (photos.length === 0) return to(0)

    const cache = await caches.open(SHARED_CACHE)
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i]
      await cache.put(
        new URL(`/__shared-photo/${i}`, self.location.origin).href,
        new Response(photo.slice(0, KEEP_BYTES), {
          headers: {
            'Content-Type': photo.type || 'application/octet-stream',
            'X-Photo-Name': encodeURIComponent(photo.name || `photo-${i}`),
            'X-Photo-Modified': String(photo.lastModified || 0),
          },
        }),
      )
    }
    return to(photos.length)
  } catch (err) {
    return to(0)
  }
}

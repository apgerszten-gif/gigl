// The printed festival QR codes encode gigl-review.vercel.app, the address
// Gigl had before gigl.space. A printed code can't be changed, so the old
// address forwards to the new one instead.
const OLD_HOST = 'gigl-review.vercel.app'
const HOME     = 'https://www.gigl.space'
const onOldHost = [{ type: 'host', value: OLD_HOST }]

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Lets client code tell production from preview and local builds.
  env: {
    NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV || 'development',
  },
  // All temporary (307), so phones don't cache them if the front door
  // changes again. Query strings carry through.
  async redirects() {
    return [
      // Every page on the old address moves to the same page on the new one.
      // Not /api, where Twilio's webhook may still be pointed and which a
      // POST can't reliably follow across a redirect, and not /_next, which
      // an old tab may still be loading its scripts from.
      { source: '/:path((?!api/|_next/).+)', has: onOldHost, destination: `${HOME}/:path`, permanent: false },

      // The bare domain opens the feed in one hop, rather than loading a
      // blank page that forwards itself in the browser. On the old host the
      // bare domain is a QR scan instead - see rewrites below.
      { source: '/', missing: onOldHost, destination: '/feed', permanent: false },

      // /log-menu was the CRSSD-or-elsewhere picker the Log button used to
      // open. Log now goes straight to the lineup, so a tab still holding
      // the old link follows it there too.
      { source: '/log-menu', destination: '/crssd', permanent: false },
    ]
  },
  // A scan of an old code is counted by /qr, which forwards to the feed on
  // gigl.space itself - still one hop from scan to page.
  async rewrites() {
    return {
      beforeFiles: [{ source: '/', has: onOldHost, destination: '/qr' }],
    }
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'djjqrjljgwnvwwzbbevp.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}
module.exports = nextConfig

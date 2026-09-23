/** @type {import('next').NextConfig} */
const nextConfig = {
  // The printed festival QR codes point at the bare domain. Redirecting on
  // the server means a scan lands on the feed in one hop, instead of loading
  // a blank page that then forwards itself in the browser. Temporary (307),
  // so phones don't cache it if the front door changes again. Query strings
  // (?src=, ?ref= from share links) carry through.
  //
  // /log-menu was the CRSSD-or-elsewhere picker the Log button used to open.
  // Log now goes straight to the lineup, so a tab still holding the old link
  // follows it there too.
  async redirects() {
    return [
      { source: '/',         destination: '/feed',  permanent: false },
      { source: '/log-menu', destination: '/crssd', permanent: false },
    ]
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

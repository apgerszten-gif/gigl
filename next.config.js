/** @type {import('next').NextConfig} */
const nextConfig = {
  // Lets client code tell production from preview and local builds.
  env: {
    NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV || 'development',
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

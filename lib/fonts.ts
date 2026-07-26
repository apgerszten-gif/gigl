import { Space_Grotesk, Inter } from 'next/font/google'

// Self-hosted via next/font (no external Google Fonts request, no
// flash-of-invisible-text). Exposed as CSS custom properties so any style
// object across the app can reference them with a plain var(...) string,
// the same way the old hardcoded 'Space Grotesk'/'Inter' names were used.
export const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '700'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

export const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
})

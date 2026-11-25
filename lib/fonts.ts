import { Alfa_Slab_One, Courier_Prime, Fraunces, Instrument_Sans } from 'next/font/google'

// Self-hosted via next/font (no external Google Fonts request, no
// flash-of-invisible-text). Exposed as CSS custom properties, which the
// Tailwind font families in tailwind.config.js read.

// Headlines and names. Its soft, wonky optical axes are what make it read as
// seventies print rather than a bookish serif; globals.css turns them on.
export const fraunces = Fraunces({
  subsets: ['latin'],
  axes: ['SOFT', 'WONK', 'opsz'],
  style: ['normal', 'italic'],
  variable: '--font-fraunces',
  display: 'swap',
})

// Everything else: UI, body copy, small numbers.
export const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-instrument',
  display: 'swap',
})

// Big numbers only: profile stats, rank numbers, year headings.
export const alfaSlab = Alfa_Slab_One({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-alfa-slab',
  display: 'swap',
})

// Labels, the marker tabs and the tape date tags.
export const courierPrime = Courier_Prime({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-courier',
  display: 'swap',
})

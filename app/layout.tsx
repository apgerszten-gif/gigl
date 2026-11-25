import type { Metadata, Viewport } from 'next'
import './globals.css'
import { FestivalThemeProvider } from '@/components/FestivalThemeProvider'
import { AuthProvider } from '@/components/AuthProvider'
import { PendingLogsSync } from '@/components/PendingLogsSync'
import { VisitTracker } from '@/components/VisitTracker'
import { alfaSlab, courierPrime, fraunces, instrumentSans } from '@/lib/fonts'

export const metadata: Metadata = {
  // Link previews (shared invites and reviews) need absolute image URLs.
  metadataBase: new URL('https://www.gigl.space'),
  title: 'Gigl — be the critic.',
  description: "Log, rate and rank the live shows you've been to",
  manifest: '/manifest.json',
}

// Declared here rather than as a <meta> in <head>: Next always emits its own
// viewport tag, and a hand-written one ends up first and is overridden by it.
// maximumScale stops iOS zooming in when a field under 16px is focused (pinch
// zoom still works there); every input is text-base regardless.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${instrumentSans.variable} ${alfaSlab.variable} ${courierPrime.variable}`}>
      <head>
        <meta name="theme-color" content="#1B1612" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
      </head>
      <body className="bg-paper min-h-screen font-sans antialiased">
        <AuthProvider>
          <FestivalThemeProvider>
            <PendingLogsSync />
            <VisitTracker />
            <div className="max-w-md mx-auto min-h-screen">
              {children}
            </div>
          </FestivalThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}

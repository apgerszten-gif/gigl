import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Gigl — rate the show',
  description: 'Log and rank your Coachella sets',
  manifest: '/manifest.json',
  themeColor: '#0c0c0e',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Gigl" />
      </head>
      <body className="bg-brand-dark min-h-screen font-sans antialiased">
        <div className="max-w-md mx-auto min-h-screen">
          {children}
        </div>
      </body>
    </html>
  )
}

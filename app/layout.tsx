import type { Metadata } from 'next'
import './globals.css'
import { FestivalThemeProvider } from '@/components/FestivalThemeProvider'
import { AuthProvider } from '@/components/AuthProvider'

export const metadata: Metadata = {
  title: 'Gigl — be the critic.',
  description: 'Log and rank your Coachella sets',
  manifest: '/manifest.json',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <meta name="theme-color" content="#EDE3D0" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className="bg-paper min-h-screen font-sans antialiased">
        <AuthProvider>
          <FestivalThemeProvider>
            <div className="max-w-md mx-auto min-h-screen">
              {children}
            </div>
          </FestivalThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}

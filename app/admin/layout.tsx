import type { Metadata } from 'next'

// Kept out of search results; the page itself is useless to anyone but the
// admin accounts (lib/adminAuth.ts).
export const metadata: Metadata = {
  title: 'Admin · Gigl',
  robots: { index: false, follow: false },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

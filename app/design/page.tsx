import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { DesignPreview } from './DesignPreview'

// Living style guide: the core screens from DESIGN.md, built from the
// Tailwind tokens with sample data. It's the rendered reference for the
// design system, so it stays in the repo, but it only exists in local dev
// and preview deployments - production builds render a 404.
export const metadata: Metadata = {
  title: 'Style guide — Gigl',
  robots: { index: false, follow: false },
}

export default function DesignPage() {
  if (process.env.VERCEL_ENV === 'production') notFound()
  return <DesignPreview />
}

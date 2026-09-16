import type { Metadata } from 'next'
import { DesignPreview } from './DesignPreview'

// Visual preview of the four core screens in DESIGN.md, built from the
// Tailwind tokens with sample data so the design can be judged in the real
// app with the real font. Nothing links here. Delete this route once the
// actual screens have moved to the design system.
export const metadata: Metadata = {
  title: 'Design preview — Gigl',
  robots: { index: false, follow: false },
}

export default function DesignPage() {
  return <DesignPreview />
}

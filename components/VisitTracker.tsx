'use client'

import { useEffect } from 'react'
import { recordVisit } from '@/lib/visitor'

// Mounted once at the root of the app (no UI). Counts this tab as one visit
// to the site - see lib/visitor.ts.
export function VisitTracker() {
  useEffect(() => { recordVisit() }, [])
  return null
}

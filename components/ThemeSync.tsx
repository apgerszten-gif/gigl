'use client'

import { useEffect } from 'react'
import { applyTheme, fetchTheme } from '@/lib/theme-setting'

// Mounted once in the root layout: asks which look the admin has chosen and
// applies it (lib/theme-setting.ts).
export function ThemeSync() {
  useEffect(() => {
    let live = true
    fetchTheme().then(theme => { if (live && theme) applyTheme(theme) })
    return () => { live = false }
  }, [])
  return null
}

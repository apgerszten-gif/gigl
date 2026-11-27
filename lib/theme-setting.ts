'use client'

import { createClient } from '@/lib/supabase/client'

// The look of the whole app, light or dark, switched from /admin (the `theme`
// row in app_settings) without a deploy. The palettes are CSS variables in
// app/globals.css keyed on <html data-theme>; this module sets the attribute.
//
// The attribute is first set before paint by the inline script in
// app/layout.tsx from what this phone last saw (localStorage), so a returning
// visitor never flashes the other look. ThemeSync then asks for the current
// setting on each load and, if the admin has flipped it, applies and
// remembers the new one. A phone that has never visited gets light, the
// default, until that answer arrives.

export type Theme = 'light' | 'dark'

export const THEME_KEY = 'gigl-theme'
export const THEME_COLOURS: Record<Theme, string> = { light: '#EDE3D0', dark: '#1B1612' }

export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOURS[theme])
  document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
    ?.setAttribute('content', theme === 'dark' ? 'black' : 'default')
  try { localStorage.setItem(THEME_KEY, theme) } catch { /* private mode */ }
}

// Anything unreadable (no table yet, a network blip) reads as null, so the
// look already on screen stays.
export async function fetchTheme(): Promise<Theme | null> {
  try {
    const { data, error } = await createClient()
      .from('app_settings')
      .select('value')
      .eq('key', 'theme')
      .maybeSingle()
    if (error) return null
    return data?.value === 'dark' ? 'dark' : 'light'
  } catch {
    return null
  }
}

'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { DEFAULT_THEME, FestivalTheme, getTheme } from '@/lib/theme'
import { LOCAL_STORAGE_KEY } from '@/lib/festivals'

const ThemeCtx = createContext<FestivalTheme>(DEFAULT_THEME)
export const useTheme = () => useContext(ThemeCtx)

export function FestivalThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<FestivalTheme>(DEFAULT_THEME)

  useEffect(() => {
    const id = localStorage.getItem(LOCAL_STORAGE_KEY)
    setTheme(getTheme(id))
  }, [])

  return <ThemeCtx.Provider value={theme}>{children}</ThemeCtx.Provider>
}

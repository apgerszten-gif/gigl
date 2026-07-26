'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

interface AuthState {
  user: User | null
  loading: boolean
}

const AuthCtx = createContext<AuthState>({ user: null, loading: true })
export const useAuth = () => useContext(AuthCtx)

// Centralizes session state behind a single getSession() read (a cheap local
// cache lookup) plus an onAuthStateChange subscription, instead of every page
// independently calling the network-round-tripping getUser() on every mount.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true })

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getSession().then(({ data: { session } }) => {
      setState({ user: session?.user ?? null, loading: false })
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ user: session?.user ?? null, loading: false })
    })

    return () => subscription.unsubscribe()
  }, [])

  return <AuthCtx.Provider value={state}>{children}</AuthCtx.Provider>
}

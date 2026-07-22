'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LOCAL_STORAGE_KEY } from '@/lib/festivals'

const ink   = '#4A3528'
const paper = '#EDE3D0'
const muted = '#8B7560'
const sans  = "'Inter', sans-serif"

export default function AuthCallbackPage() {
  const router   = useRouter()
  const supabase = createClient()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function run() {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session) {
        setError(sessionError?.message ?? 'Sign-in failed. Please try again.')
        return
      }

      const { user } = session
      const isFirstSignIn = !!user.created_at && !!user.last_sign_in_at &&
        Math.abs(new Date(user.last_sign_in_at).getTime() - new Date(user.created_at).getTime()) < 5000

      const hasFestival = localStorage.getItem(LOCAL_STORAGE_KEY)

      if (isFirstSignIn) {
        router.replace('/choose-username')
        return
      }
      router.replace(hasFestival ? '/feed' : '/select-festival')
    }
    run()
  }, [])

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: paper, fontFamily: sans, color: ink, padding: 24,
    }}>
      {error ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: '#B03030', marginBottom: 12 }}>{error}</div>
          <a href="/auth" style={{ color: '#B85827', fontSize: 13, textDecoration: 'underline', textUnderlineOffset: 3 }}>
            Back to sign in
          </a>
        </div>
      ) : (
        <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: muted, fontWeight: 600 }}>
          Signing you in&hellip;
        </div>
      )}
    </div>
  )
}

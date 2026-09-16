'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LOCAL_STORAGE_KEY } from '@/lib/festivals'
import { LoadingLabel } from '@/components/ui'

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

      const { data: profile } = await supabase
        .from('profiles')
        .select('username_set')
        .eq('id', session.user.id)
        .single()

      if (!profile || profile.username_set === false) {
        router.replace('/choose-username')
        return
      }

      const hasFestival = localStorage.getItem(LOCAL_STORAGE_KEY)
      router.replace(hasFestival ? '/feed' : '/select-festival')
    }
    run()
  }, [])

  return (
    <div className="min-h-screen bg-paper text-ink p-6 flex items-center justify-center">
      {error ? (
        <div className="text-center">
          <p className="mb-3 text-[13px] text-[#B03030]">{error}</p>
          <Link href="/auth" className="text-[13px] text-accent underline underline-offset-[3px]">Back to sign in</Link>
        </div>
      ) : (
        <LoadingLabel>Signing you in&hellip;</LoadingLabel>
      )}
    </div>
  )
}

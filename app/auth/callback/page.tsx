'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { pathAfterSignIn } from '@/lib/afterSignIn'
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

      router.replace(await pathAfterSignIn(supabase, session.user.id))
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

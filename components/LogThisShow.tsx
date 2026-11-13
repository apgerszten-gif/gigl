'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { btnPrimary } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { useStartLogging, type LoggableShow } from '@/lib/useStartLogging'

// The way in to logging from a show's page of reviews (/artist/<id>), after
// the reviews and setlist: someone who searched for a show reads what people
// thought first, then logs their own. Hidden once the viewer has logged it;
// their log is edited from You.
export function LogThisShow({ show }: { show: LoggableShow }) {
  const { user, loading } = useAuth()
  const startLogging = useStartLogging()
  const [logged, setLogged] = useState<boolean | null>(null)

  useEffect(() => {
    if (loading) return
    if (!user) { setLogged(false); return }
    let live = true
    createClient()
      .from('logged_shows').select('id').eq('user_id', user.id).eq('artist_id', show.id).maybeSingle()
      .then(({ data }) => { if (live) setLogged(data != null) })
    return () => { live = false }
  }, [user, loading, show.id])

  if (logged !== false) return null
  return (
    <button type="button" onClick={() => startLogging(show)} className={`${btnPrimary} w-full py-3.5 text-xs`}>
      Were you there? Log it
    </button>
  )
}

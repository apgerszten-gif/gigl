'use client'

import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { btnPrimary } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { useStartLogging, type LoggableShow } from '@/lib/useStartLogging'

// The way in to logging from a show's page of reviews (/artist/<id>), beside
// "See the setlist" above the reviews. Hidden once the viewer has logged it
// (their log is edited from You), and the setlist button then takes the row.
// Renders its own half of that row.
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
    <div className="flex-1 min-w-0">
      <button type="button" onClick={() => startLogging(show)} className={`${btnPrimary} w-full py-3 text-[11px]`}>
        <Plus className="w-4 h-4" strokeWidth={2.5} aria-hidden />
        Log it
      </button>
    </div>
  )
}

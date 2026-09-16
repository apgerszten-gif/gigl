'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { eloToDisplay } from '@/lib/elo'
import BottomNav from '@/components/BottomNav'
import { Logo } from '@/components/Logo'
import { ArtistPhoto, BackHeader, EmptyState, Label, Place } from '@/components/ui'

const SCORE_THRESHOLD = 4

interface LoggedArtist {
  artist_id:   string
  elo:         number
  artist_name: string
  stage:       string
}

export default function RankPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [logs, setLogs]       = useState<LoggedArtist[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchLogs() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }

      const { data } = await supabase
        .from('logged_shows')
        .select('artist_id, elo, artist_name, stage')
        .eq('user_id', user.id)
        .order('elo', { ascending: false })

      if (data) setLogs(data)
      setLoading(false)
    }
    fetchLogs()
  }, [])

  const hasEnoughForScores = logs.length >= SCORE_THRESHOLD

  return (
    <div className="min-h-screen bg-paper text-ink pb-28">
      <BackHeader title={<Logo />} onBack={() => router.push('/feed')} />

      <div className="px-5 pt-5 space-y-4">
        <div>
          <Label tone="accent">Your rankings</Label>
          <h1 className="font-display text-[28px] font-bold tracking-tight leading-tight">
            Your leaderboard<span className="text-accent">.</span>
          </h1>
          <Label className="mt-1">
            {logs.length} shows ranked
            {!hasEnoughForScores && logs.length > 0 && ` · log ${SCORE_THRESHOLD - logs.length} more to unlock scores`}
          </Label>
        </div>

        {logs.length === 0 && !loading && (
          <EmptyState>Log some shows to build your rankings</EmptyState>
        )}

        {logs.length > 0 && (
          <div className="rounded-card border-1.5 border-ink bg-cream shadow-riso overflow-hidden">
            {logs.map((log, i) => (
              <div
                key={log.artist_id}
                className={`flex items-center gap-3 px-3 py-2.5 ${i > 0 ? 'border-t border-ink/10' : ''} ${i < 3 ? 'bg-accent/10' : ''}`}
              >
                <span className="font-display text-2xl font-bold leading-none w-7 flex-shrink-0 text-center text-accent">{i + 1}</span>
                <ArtistPhoto name={log.artist_name} className="w-11 h-11" iconSize={15} />
                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-[15px] font-bold leading-tight truncate">{log.artist_name}</h3>
                  {log.stage && <Place className="mt-0.5">{log.stage}</Place>}
                </div>
                <span className={`font-display text-xl font-bold min-w-[36px] text-right ${hasEnoughForScores ? 'text-accent' : 'text-ink-faint'}`}>
                  {hasEnoughForScores ? eloToDisplay(log.elo) : '—'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}

'use client'

import { useEffect, useState, Suspense, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { recordBattleResult } from '@/lib/battleRecords'
import { Logo } from '@/components/Logo'
import { ArtistPhoto, BackHeader, Label, Place } from '@/components/ui'
import { useArtistImages } from '@/lib/useArtistImages'

const MAX_SESSION = 10

interface LoggedArtist {
  artist_id:   string
  artist_name: string
  stage:       string
}

function pairKey(a: string, b: string): string {
  return [a, b].sort().join('|')
}

function BattleInner() {
  const router   = useRouter()
  const supabase = createClient()

  const [logs, setLogs]                 = useState<LoggedArtist[]>([])
  const [pair, setPair]                 = useState<[LoggedArtist, LoggedArtist] | null>(null)
  const [loading, setLoading]           = useState(true)
  const [battles, setBattles]           = useState(0)
  const [sessionLimit, setSessionLimit] = useState(MAX_SESSION)
  const [picked, setPicked]             = useState<string | null>(null)
  const [tossUp, setTossUp]             = useState(false)

  const usedPairKeys = useRef<Set<string>>(new Set())
  const userIdRef = useRef<string | null>(null)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    userIdRef.current = user.id

    const { data } = await supabase
      .from('logged_shows')
      .select('artist_id, artist_name, stage')
      .eq('user_id', user.id)

    if (!data || data.length < 2) {
      router.push('/feed')
      return
    }

    setLogs(data)
    const maxPossiblePairs = Math.floor((data.length * (data.length - 1)) / 2)
    setSessionLimit(Math.min(MAX_SESSION, maxPossiblePairs))
    pickPair(data)
    setLoading(false)
  }

  function pickPair(data: LoggedArtist[]) {
    const attempts = 30
    for (let i = 0; i < attempts; i++) {
      const shuffled = [...data].sort(() => Math.random() - 0.5)
      const [a, b] = shuffled
      if (!usedPairKeys.current.has(pairKey(a.artist_id, b.artist_id))) {
        setPair([a, b])
        return
      }
    }
    // Exhausted unique pairs for this session (small logged history) — repeat is fine.
    const shuffled = [...data].sort(() => Math.random() - 0.5)
    setPair([shuffled[0], shuffled[1]])
  }

  async function handlePick(winnerId: string) {
    if (!pair || picked || tossUp) return
    setPicked(winnerId)

    setTimeout(async () => {
      const [a, b]    = pair
      const isAWinner = winnerId === a.artist_id
      const winner    = isAWinner ? a : b
      const loser     = isAWinner ? b : a

      usedPairKeys.current.add(pairKey(winner.artist_id, loser.artist_id))

      const userId = userIdRef.current
      if (userId) {
        try {
          await recordBattleResult(supabase, userId, winner.artist_id, loser.artist_id)
        } catch (err) {
          console.error('recordBattleResult failed:', err)
        }
      }

      const newCount = battles + 1
      setBattles(newCount)
      setPicked(null)

      if (newCount >= sessionLimit) { router.push('/feed'); return }

      pickPair(logs)
    }, 700)
  }

  function handleTossUp() {
    if (!pair || picked || tossUp) return
    setTossUp(true)

    setTimeout(() => {
      const [a, b] = pair
      usedPairKeys.current.add(pairKey(a.artist_id, b.artist_id))

      const newCount = battles + 1
      setBattles(newCount)
      setTossUp(false)

      if (newCount >= sessionLimit) { router.push('/feed'); return }

      pickPair(logs)
    }, 700)
  }

  const artistImage = useArtistImages(logs.map(l => l.artist_name))

  if (loading) return null

  return (
    <div className="min-h-screen bg-paper text-ink">
      <BackHeader title={<Logo />} onBack={() => router.push('/feed')} />

      <div className="px-5 pt-6 pb-10">
        {/* Progress dots */}
        <div className="flex flex-wrap justify-center gap-1.5 mb-8">
          {Array.from({ length: sessionLimit }).map((_, i) => (
            <span
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i < battles ? 'bg-accent' : i === battles ? 'bg-ink' : 'bg-ink-faint'
              }`}
            />
          ))}
        </div>

        <Label tone="accent" className="mb-1">Battle {battles + 1} of {sessionLimit}</Label>
        <h1 className="font-display text-[34px] font-bold tracking-tight leading-[1.05] mb-7">
          Which set hit<br />harder<span className="text-accent">?</span>
        </h1>

        {pair && (
          <>
            <div className="grid grid-cols-2 gap-2.5 mb-5">
              {pair.map(log => {
                const isWinner = picked === log.artist_id
                const isLoser  = picked !== null && picked !== log.artist_id
                const isTied   = tossUp
                const lit      = isWinner || isTied

                return (
                  <button
                    key={log.artist_id}
                    type="button"
                    onClick={() => handlePick(log.artist_id)}
                    disabled={!!picked || tossUp}
                    className={`text-left rounded-card overflow-hidden transition-all duration-200 ${
                      lit ? 'bg-accent/10 border-2 border-accent shadow-riso scale-[1.02]' : 'bg-cream border-1.5 border-ink'
                    } ${isLoser ? 'opacity-40' : ''} ${picked || tossUp ? 'cursor-default' : ''}`}
                  >
                    <div className="relative p-2.5 pb-0">
                      <ArtistPhoto name={log.artist_name} src={artistImage(log.artist_name)} className="w-full h-28" iconSize={32} />
                      {lit && (
                        <span className="absolute top-4 right-4 w-7 h-7 rounded-full bg-accent text-cream border-1.5 border-ink flex items-center justify-center font-bold">
                          {isTied ? '=' : <Check className="w-4 h-4" strokeWidth={3} />}
                        </span>
                      )}
                    </div>
                    <div className="p-2.5 space-y-2">
                      <div className="min-w-0">
                        <h3 className="font-display text-[15px] font-bold leading-tight truncate">{log.artist_name}</h3>
                        {log.stage && <Place className="mt-0.5">{log.stage}</Place>}
                      </div>
                      <span className={`block rounded py-2 text-center text-[11px] font-bold uppercase tracking-label transition-colors ${
                        lit ? 'bg-accent text-cream border-1.5 border-ink' : 'bg-paper text-ink-muted border border-ink/15'
                      }`}>
                        {isWinner ? '✓ Picked' : isTied ? "It's a toss up" : 'Pick this'}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>

            {!picked && !tossUp && (
              <div className="flex flex-col items-center gap-3.5 text-center">
                <button
                  type="button"
                  onClick={handleTossUp}
                  className="rounded-full border border-ink-faint px-4 py-2 text-[11px] font-bold uppercase tracking-label text-ink-muted"
                >It&apos;s a toss up</button>
                <button
                  type="button"
                  onClick={() => pickPair(logs)}
                  className="text-[11px] uppercase tracking-label text-ink-faint"
                >Skip this match</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function BattlePage() {
  return (
    <Suspense fallback={null}>
      <BattleInner />
    </Suspense>
  )
}

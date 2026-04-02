'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { newRatings, eloToDisplay } from '@/lib/elo'

interface Show {
  id: string
  artist_name: string
  stage: string
  day: string
  emoji: string
  elo: number
  review: string | null
  tags: string[] | null
}

function RankContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const newShowId = searchParams.get('new')
  const [shows, setShows] = useState<Show[]>([])
  const [matchups, setMatchups] = useState<[Show, Show][]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [picked, setPicked] = useState<'a' | 'b' | null>(null)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      const { data } = await supabase
        .from('logged_shows')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (!data || data.length < 2) { router.replace('/profile'); return }
      const newS = data.find(s => s.id === newShowId) || data[0]
      const others = data.filter(s => s.id !== newS.id)
      const opponents = others.slice(0, Math.min(4, others.length))
      setMatchups(opponents.map(o => [newS, o] as [Show, Show]))
      setShows(data)
      setLoading(false)
    }
    load()
  }, [newShowId, router])

  async function pick(winner: Show, loser: Show) {
    if (picked) return
    setPicked(matchups[currentIdx][0].id === winner.id ? 'a' : 'b')
    const { winner: wElo, loser: lElo } = newRatings(winner.elo, loser.elo)
    winner.elo = wElo
    loser.elo = lElo
    await Promise.all([
      supabase.from('logged_shows').update({ elo: wElo }).eq('id', winner.id),
      supabase.from('logged_shows').update({ elo: lElo }).eq('id', loser.id),
    ])
    setTimeout(() => {
      setPicked(null)
      if (currentIdx + 1 >= matchups.length) setDone(true)
      else setCurrentIdx(i => i + 1)
    }, 700)
  }

  function skip() {
    if (currentIdx + 1 >= matchups.length) setDone(true)
    else setCurrentIdx(i => i + 1)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
    </div>
  )

  if (done) {
    const sorted = [...shows].sort((a, b) => b.elo - a.elo)
    return (
      <div className="min-h-screen px-5 pt-10 pb-10 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center mb-5">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <path d="M14 3l2.5 7.5H24l-6.4 4.6 2.5 7.5L14 18.1l-6.1 4.5 2.5-7.5L4 10.5h7.5z"
              stroke="#D4537E" strokeWidth="1.4" fill="rgba(212,83,126,0.1)" strokeLinejoin="round"/>
          </svg>
        </div>
        <h1 className="font-serif text-2xl text-white mb-2">Rankings updated.</h1>
        <p className="text-white/35 text-sm mb-8">Every new show you log triggers fresh matchups.</p>
        <div className="w-full flex flex-col gap-2 mb-8">
          {sorted.map((s, i) => {
            const medals = ['🥇','🥈','🥉']
            return (
              <div key={s.id} className="flex items-center gap-3 rounded-xl border border-white/[0.06] px-4 py-3"
                style={{background:'#161618'}}>
                <span className="text-base w-6 text-center">{medals[i] || `${i+1}`}</span>
                <span className="text-xl">{s.emoji}</span>
                <div className="flex-1 text-left">
                  <p className="text-white text-sm font-medium">{s.artist_name}</p>
                  <p className="text-white/35 text-xs">{s.stage} · {s.day}</p>
                </div>
                <span className="font-serif text-lg text-brand">{eloToDisplay(s.elo)}</span>
              </div>
            )
          })}
        </div>
        <button onClick={() => router.push('/profile')}
          className="w-full bg-brand text-white rounded-2xl py-4 text-sm font-medium active:opacity-80 mb-2">
          See my profile →
        </button>
        <button onClick={() => router.push('/log')} className="w-full text-white/25 text-sm py-3">
          Log another set
        </button>
      </div>
    )
  }

  const [showA, showB] = matchups[currentIdx]

  return (
    <div className="min-h-screen flex flex-col">
      <div className="px-5 pt-6 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="bg-brand/10 border border-brand/20 rounded-full px-3 py-1 text-xs font-medium text-brand">
            Round {currentIdx + 1} of {matchups.length}
          </div>
          <div className="flex gap-1.5">
            {matchups.map((_, i) => (
              <div key={i} className={`h-[3px] w-6 rounded-full transition-colors ${i < currentIdx ? 'bg-brand' : i === currentIdx ? 'bg-brand/40' : 'bg-white/10'}`} />
            ))}
          </div>
        </div>
        <h1 className="font-serif text-2xl text-white">Which was better?</h1>
        <p className="text-white/30 text-xs mt-1">Tap to pick · no overthinking</p>
      </div>

      <div className="flex-1 px-5 flex flex-col gap-3 pb-6">
        <button onClick={() => pick(showA, showB)} disabled={!!picked}
          className={`flex-1 rounded-2xl border text-left p-5 transition-all flex flex-col gap-3 ${
            picked === 'a' ? 'border-brand' : picked === 'b' ? 'border-white/[0.03] opacity-30' : 'border-white/[0.06] active:border-brand/40'
          }`}
          style={{background: picked === 'a' ? 'rgba(212,83,126,0.07)' : '#1a1a1d'}}>
          <div className="flex gap-3 items-start">
            <span className="text-4xl leading-none">{showA.emoji}</span>
            <div className="flex-1">
              <p className="text-white font-medium text-lg leading-tight">{showA.artist_name}</p>
              <p className="text-white/35 text-xs mt-1">{showA.stage} · {showA.day}</p>
            </div>
          </div>
          {showA.review && (
            <p className="text-white/40 text-xs italic leading-relaxed line-clamp-2">"{showA.review}"</p>
          )}
        </button>

        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex-1 h-px bg-white/[0.06]" />
          <span className="font-serif text-white/20 italic text-sm">vs</span>
          <div className="flex-1 h-px bg-white/[0.06]" />
        </div>

        <button onClick={() => pick(showB, showA)} disabled={!!picked}
          className={`flex-1 rounded-2xl border text-left p-5 transition-all flex flex-col gap-3 ${
            picked === 'b' ? 'border-brand' : picked === 'a' ? 'border-white/[0.03] opacity-30' : 'border-white/[0.06] active:border-brand/40'
          }`}
          style={{background: picked === 'b' ? 'rgba(212,83,126,0.07)' : '#1a1a1d'}}>
          <div className="flex gap-3 items-start">
            <span className="text-4xl leading-none">{showB.emoji}</span>
            <div className="flex-1">
              <p className="text-white font-medium text-lg leading-tight">{showB.artist_name}</p>
              <p className="text-white/35 text-xs mt-1">{showB.stage} · {showB.day}</p>
            </div>
          </div>
          {showB.review && (
            <p className="text-white/40 text-xs italic leading-relaxed line-clamp-2">"{showB.review}"</p>
          )}
        </button>
      </div>

      <div className="px-5 pb-8 flex-shrink-0 text-center">
        <button onClick={skip} className="text-white/20 text-sm">skip this matchup</button>
      </div>
    </div>
  )
}

export default function RankPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </div>
    }>
      <RankContent />
    </Suspense>
  )
}

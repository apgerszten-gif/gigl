'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { eloToDisplay } from '@/lib/elo'
import BottomNav from '@/components/BottomNav'
import Link from 'next/link'

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

interface Profile {
  username: string
  display_name: string
}

function scoreColor(score: string) {
  const n = parseFloat(score)
  if (n >= 9) return '#F5A623'
  if (n >= 7.5) return '#D4537E'
  if (n >= 6) return '#E8832A'
  return 'rgba(255,255,255,0.3)'
}

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [shows, setShows] = useState<Show[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      const [{ data: prof }, { data: showData }] = await Promise.all([
        supabase.from('profiles').select('username, display_name').eq('id', user.id).single(),
        supabase.from('logged_shows').select('*').eq('user_id', user.id).order('elo', { ascending: false }),
      ])
      setProfile(prof)
      setShows(showData || [])
      setLoading(false)
    }
    load()
  }, [router])

  async function copyLink() {
    if (!profile) return
    const url = `${window.location.origin}/u/${profile.username}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  const avgScore = shows.length > 0
    ? (shows.reduce((acc, s) => acc + parseFloat(eloToDisplay(s.elo)), 0) / shows.length).toFixed(1)
    : null

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen pb-28">
      <div style={{background:'linear-gradient(180deg,#1f0a12 0%,#0c0c0e 100%)'}}>
        <div className="px-5 pt-12 pb-0">
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-serif text-2xl text-white flex-shrink-0"
                style={{background:'linear-gradient(135deg,#D4537E,#C4651A)'}}>
                {profile?.display_name?.[0]?.toUpperCase()}
              </div>
              <div>
                <h1 className="font-serif text-xl text-white">{profile?.display_name}</h1>
                <p className="text-white/30 text-xs mt-0.5">@{profile?.username}</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                  <p className="text-brand/70 text-xs font-medium">Coachella W1 2026</p>
                </div>
              </div>
            </div>
            <button onClick={signOut} className="text-white/20 text-xs pt-1">sign out</button>
          </div>
          <div className="grid grid-cols-3 border-t border-white/[0.07] -mx-5">
            {[
              { label: 'Sets logged', value: shows.length.toString() },
              { label: 'Avg score', value: avgScore || '—' },
              { label: 'Weekend', value: 'W1' },
            ].map((stat, i) => (
              <div key={i} className={`py-4 text-center ${i < 2 ? 'border-r border-white/[0.07]' : ''}`}>
                <p className="font-serif text-xl text-white">{stat.value}</p>
                <p className="text-[10px] uppercase tracking-wider text-white/25 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-5 pt-4">
        <button onClick={copyLink}
          className="w-full mb-5 rounded-xl border flex items-center gap-3 px-4 py-3 transition-colors active:opacity-70"
          style={{background:'rgba(212,83,126,0.06)', borderColor:'rgba(212,83,126,0.2)'}}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{background:'rgba(212,83,126,0.15)'}}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M8 1h5v5M13 1L6 8M5.5 3H2a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V8.5" stroke="#D4537E" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="flex-1 text-left">
            <p className="text-white text-sm font-medium">{copied ? 'Link copied!' : 'Share my rankings'}</p>
            <p className="text-white/25 text-xs">gigl.app/u/{profile?.username}</p>
          </div>
        </button>

        <p className="text-[10px] uppercase tracking-[0.15em] text-white/25 mb-3">My rankings</p>

        {shows.length === 0 ? (
          <div className="text-center py-14">
            <p className="text-4xl mb-3">🎪</p>
            <p className="text-white/25 text-sm mb-5">No sets logged yet</p>
            <Link href="/log" className="inline-block text-white text-sm font-medium rounded-xl px-6 py-3"
              style={{background:'#D4537E'}}>
              Log your first set →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {shows.map((show, i) => {
              const score = eloToDisplay(show.elo)
              const rankLabel = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}`
              return (
                <div key={show.id} className="flex items-center gap-3 rounded-xl border border-white/[0.05] px-4 py-3 fade-up"
                  style={{background:'#161618', animationDelay:`${i*40}ms`}}>
                  <span className="text-sm w-5 text-center flex-shrink-0 font-medium"
                    style={{color: i > 2 ? 'rgba(255,255,255,0.2)' : undefined}}>
                    {rankLabel}
                  </span>
                  <span className="text-2xl flex-shrink-0">{show.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{show.artist_name}</p>
                    <p className="text-white/30 text-xs mt-0.5">{show.stage} · {show.day}</p>
                    {show.tags?.[0] && (
                      <p className="text-xs mt-1" style={{color:'rgba(212,83,126,0.6)'}}>{show.tags[0]}</p>
                    )}
                  </div>
                  <span className="font-serif text-xl flex-shrink-0" style={{color: scoreColor(score)}}>{score}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  )
}

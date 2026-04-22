'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { eloToDisplay } from '@/lib/elo'
import BottomNav from '@/components/BottomNav'

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
    setTimeout(() => setCopied(false), 2000)
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  const avgScore = shows.length > 0
    ? (shows.reduce((acc, s) => acc + parseFloat(eloToDisplay(s.elo)), 0) / shows.length).toFixed(1)
    : '—'

  const medals = ['🥇', '🥈', '🥉']

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" /></div>
  }

  return (
    <div className="min-h-screen pb-28">
      {/* Header */}
      <div className="bg-[#1a0a10] px-5 pt-8 pb-0">
        <div className="flex items-end gap-4 mb-4">
          <div className="w-16 h-16 rounded-full bg-brand flex items-center justify-center font-serif text-2xl text-white flex-shrink-0">
            {profile?.display_name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1">
            <h1 className="font-serif text-xl text-white">{profile?.display_name}</h1>
            <p className="text-white/35 text-xs mt-0.5">@{profile?.username} · Coachella 2026</p>
          </div>
          <button onClick={signOut} className="text-white/20 text-xs">sign out</button>
        </div>

        {/* Stats */}
        <div className="flex border-t border-white/[0.08] -mx-5">
          <div className="flex-1 py-3 text-center border-r border-white/[0.08]">
            <p className="text-lg font-medium text-white">{shows.length}</p>
            <p className="text-[10px] uppercase tracking-wider text-white/30 mt-0.5">Shows</p>
          </div>
          <div className="flex-1 py-3 text-center border-r border-white/[0.08]">
            <p className="text-lg font-medium text-white">{avgScore}</p>
            <p className="text-[10px] uppercase tracking-wider text-white/30 mt-0.5">Avg score</p>
          </div>
          <div className="flex-1 py-3 text-center">
            <p className="text-lg font-medium text-white">W1</p>
            <p className="text-[10px] uppercase tracking-wider text-white/30 mt-0.5">Weekend</p>
          </div>
        </div>
      </div>

      {/* Share link */}
      <div className="px-5 py-4">
        <button
          onClick={copyLink}
          className="w-full bg-card border border-white/[0.08] rounded-xl px-4 py-3 flex items-center gap-3 active:opacity-70"
        >
          <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 1h4v4M13 1L7 7M6 2H2a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V8" stroke="#D4537E" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="flex-1 text-left">
            <p className="text-white text-sm font-medium">{copied ? 'Copied!' : 'Share my rankings'}</p>
            <p className="text-white/30 text-xs">gigl.app/u/{profile?.username}</p>
          </div>
          {copied && <span className="text-brand text-xs font-medium">✓</span>}
        </button>
      </div>

      {/* Shows list */}
      <div className="px-5">
        <p className="text-xs uppercase tracking-widest text-white/25 mb-3">My rankings</p>
        {shows.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-white/20 text-sm mb-4">No shows logged yet</p>
            <button onClick={() => router.push('/log')} className="bg-brand text-white rounded-xl px-6 py-3 text-sm font-medium">
              Log your first set →
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {shows.map((show, i) => (
              <div key={show.id} className="bg-card border border-white/[0.06] rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-base w-5 text-center flex-shrink-0">{medals[i] || <span className="text-white/20 text-sm font-medium">{i+1}</span>}</span>
                  <span className="text-xl flex-shrink-0">{show.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium">{show.artist_name}</p>
                    <p className="text-white/35 text-xs mt-0.5">{show.stage} · {show.day}</p>
                  </div>
                  <span className="font-serif text-lg text-brand flex-shrink-0">{eloToDisplay(show.elo)}</span>
                </div>
                {show.review && (
                  <p className="mt-2 ml-10 text-white/50 text-xs italic leading-relaxed">"{show.review}"</p>
                )}
                {show.tags && show.tags.length > 0 && (
                  <div className="mt-2 ml-10 flex flex-wrap gap-1.5">
                    {show.tags.map(tag => (
                      <span key={tag} className="text-xs px-2.5 py-0.5 rounded-full bg-brand/10 text-brand/70 border border-brand/20">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}

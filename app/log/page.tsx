'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { artists, Artist, Day } from '@/lib/artists'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'

const DAYS: Day[] = ['Friday', 'Saturday', 'Sunday']
const TAGS = ['transcendent', 'intimate', 'chaotic', 'best live band', 'mid setlist', 'crowd was everything', 'underrated', 'life-changing', 'genre-defying', 'raw energy']

export default function LogPage() {
  const router = useRouter()
  const [step, setStep] = useState<'search' | 'review'>('search')
  const [query, setQuery] = useState('')
  const [dayFilter, setDayFilter] = useState<Day | 'All'>('All')
  const [selected, setSelected] = useState<Artist | null>(null)
  const [review, setReview] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [alreadyLogged, setAlreadyLogged] = useState<string[]>([])

  const filtered = artists.filter(a => {
    const matchesQuery = a.name.toLowerCase().includes(query.toLowerCase())
    const matchesDay = dayFilter === 'All' || a.day === dayFilter
    return matchesQuery && matchesDay
  })

  useEffect(() => {
    async function fetchLogged() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('logged_shows')
        .select('artist_id')
        .eq('user_id', user.id)
      if (data) setAlreadyLogged(data.map(d => d.artist_id))
    }
    fetchLogged()
  }, [])

  function toggleTag(tag: string) {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  async function handleLog() {
    if (!selected) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }

    const { data, error } = await supabase.from('logged_shows').insert({
      user_id: user.id,
      artist_id: selected.id,
      artist_name: selected.name,
      stage: selected.stage,
      day: selected.day,
      genre: selected.genre,
      emoji: selected.emoji,
      review: review || null,
      tags: tags.length > 0 ? tags : null,
      elo: 1500,
    }).select().single()

    if (error) {
      alert(error.message)
      setLoading(false)
      return
    }

    // Redirect to H2H ranking
    router.push(`/rank?new=${data.id}`)
  }

  if (step === 'review' && selected) {
    return (
      <div className="min-h-screen pb-24">
        <div className="px-5 pt-6 pb-4 flex items-center gap-3">
          <button onClick={() => setStep('search')} className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center text-white/50">
            ←
          </button>
          <h1 className="font-serif text-xl text-white">How was it?</h1>
        </div>

        {/* Selected show card */}
        <div className="mx-5 mb-4 bg-card rounded-2xl border border-white/[0.06] p-4 flex gap-3 items-center">
          <span className="text-3xl">{selected.emoji}</span>
          <div>
            <p className="font-medium text-white text-[15px]">{selected.name}</p>
            <p className="text-white/40 text-xs mt-0.5">{selected.stage} Stage · {selected.day}</p>
          </div>
        </div>

        {/* Review */}
        <div className="mx-5 mb-4 bg-card rounded-2xl border border-white/[0.06] overflow-hidden">
          <textarea
            value={review}
            onChange={e => setReview(e.target.value)}
            placeholder="What made it unforgettable? Or didn't…"
            rows={4}
            maxLength={280}
            className="w-full bg-transparent px-4 pt-4 pb-2 text-white/80 text-sm placeholder:text-white/20 outline-none resize-none leading-relaxed"
          />
          <p className="px-4 pb-3 text-white/20 text-xs text-right">{review.length} / 280</p>
        </div>

        {/* Tags */}
        <div className="px-5 mb-6">
          <p className="text-xs uppercase tracking-widest text-white/25 mb-3">Vibe tags</p>
          <div className="flex flex-wrap gap-2">
            {TAGS.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  tags.includes(tag)
                    ? 'bg-brand/15 border-brand text-brand'
                    : 'bg-white/[0.04] border-white/10 text-white/40'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <div className="px-5">
          <button
            onClick={handleLog}
            disabled={loading}
            className="w-full bg-brand text-white rounded-2xl py-4 text-sm font-medium disabled:opacity-40 active:opacity-80 transition-opacity"
          >
            {loading ? 'Saving…' : 'Save & rank it →'}
          </button>
          <button
            onClick={handleLog}
            disabled={loading}
            className="w-full mt-2 text-white/25 text-sm py-3"
          >
            Skip review, just rank
          </button>
        </div>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24">
      <div className="px-5 pt-6 pb-2">
        <h1 className="font-serif text-2xl text-white mb-1">Log a set</h1>
        <p className="text-white/35 text-sm">Which Coachella show did you just see?</p>
      </div>

      {/* Search */}
      <div className="px-5 py-3">
        <div className="bg-card border border-white/10 rounded-xl flex items-center gap-3 px-4 py-3">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="6" cy="6" r="4.5" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2"/>
            <path d="M10 10l2.5 2.5" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search artist…"
            className="flex-1 bg-transparent text-white text-sm placeholder:text-white/25 outline-none"
            autoFocus
          />
        </div>
      </div>

      {/* Day filter */}
      <div className="px-5 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
        {(['All', ...DAYS] as const).map(day => (
          <button
            key={day}
            onClick={() => setDayFilter(day as Day | 'All')}
            className={`flex-shrink-0 text-xs px-4 py-2 rounded-full border transition-colors ${
              dayFilter === day
                ? 'bg-brand/15 border-brand text-brand'
                : 'border-white/10 text-white/40'
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="px-5 flex flex-col gap-2">
        {filtered.length === 0 && (
          <p className="text-white/25 text-sm text-center py-8">No artists found</p>
        )}
        {filtered.map(artist => {
          const logged = alreadyLogged.includes(artist.id)
          return (
            <button
              key={artist.id}
              onClick={() => { if (!logged) { setSelected(artist); setStep('review') } }}
              className={`flex items-center gap-3 w-full text-left bg-card border rounded-xl px-4 py-3 transition-colors ${
                logged ? 'border-brand/20 opacity-50' : 'border-white/[0.06] active:border-brand/40'
              }`}
            >
              <span className="text-2xl">{artist.emoji}</span>
              <div className="flex-1">
                <p className="text-white text-sm font-medium">{artist.name}</p>
                <p className="text-white/35 text-xs mt-0.5">{artist.stage} · {artist.day}</p>
              </div>
              {logged ? (
                <span className="text-xs text-brand/60 font-medium">logged ✓</span>
              ) : (
                <span className="text-white/20 text-lg">›</span>
              )}
            </button>
          )
        })}
      </div>

      <BottomNav />
    </div>
  )
}

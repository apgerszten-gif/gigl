'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { artists, Artist, Day } from '@/lib/artists'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'

const DAYS: Day[] = ['Friday', 'Saturday', 'Sunday', 'TBA']
const TAGS = ['transcendent','intimate','chaotic energy','best live band','mid setlist','crowd was everything','underrated','life-changing','genre-defying','raw energy','surprised me','worth the clash']

const DAY_COLORS: Record<string, string> = {
  Friday: '#7B5EA7',
  Saturday: '#D4537E',
  Sunday: '#C4651A',
  TBA: 'rgba(255,255,255,0.3)',
}

type Reaction = 'liked' | 'fine' | 'disliked'

const REACTIONS: { key: Reaction; emoji: string; label: string; sublabel: string; elo: number; color: string }[] = [
  { key: 'liked',    emoji: '👍', label: 'Liked it',     sublabel: 'Worth the hype',    elo: 1600, color: '#1D9E75' },
  { key: 'fine',     emoji: '🤷', label: 'It was fine',  sublabel: 'Solid, not special', elo: 1500, color: '#BA7517' },
  { key: 'disliked', emoji: '👎', label: "Didn't do it", sublabel: 'Not for me',         elo: 1400, color: '#D4537E' },
]

export default function LogPage() {
  const router = useRouter()
  const [step, setStep] = useState<'search' | 'react' | 'review'>('search')
  const [query, setQuery] = useState('')
  const [dayFilter, setDayFilter] = useState<Day | 'All'>('All')
  const [selected, setSelected] = useState<Artist | null>(null)
  const [reaction, setReaction] = useState<Reaction | null>(null)
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
      const { data } = await supabase.from('logged_shows').select('artist_id').eq('user_id', user.id)
      if (data) setAlreadyLogged(data.map(d => d.artist_id))
    }
    fetchLogged()
  }, [])

  function toggleTag(tag: string) {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  async function handleLog() {
    if (!selected || !reaction) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }
    const reactionData = REACTIONS.find(r => r.key === reaction)!
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
      elo: reactionData.elo,
    }).select().single()
    if (error) { alert(error.message); setLoading(false); return }
    router.push(`/rank?new=${data.id}`)
  }

  if (step === 'react' && selected) {
    return (
      <div className="min-h-screen pb-28">
        <div className="sticky top-0 z-40 bg-[#0c0c0e]/90 backdrop-blur-xl border-b border-white/[0.05] px-5 pt-12 pb-4 flex items-center gap-3">
          <button onClick={() => setStep('search')} className="w-9 h-9 rounded-full bg-card flex items-center justify-center text-white/40 flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/30">Step 1 of 2</p>
            <h1 className="font-serif text-lg text-white leading-tight">How was it?</h1>
          </div>
        </div>
        <div className="mx-5 mt-5 mb-6 rounded-2xl overflow-hidden border border-white/[0.06]"
          style={{background:`linear-gradient(135deg,${DAY_COLORS[selected.day]}22,#1a1a1d)`}}>
          <div className="px-4 py-4 flex gap-4 items-center">
            <span className="text-4xl">{selected.emoji}</span>
            <div>
              <p className="font-medium text-white text-base">{selected.name}</p>
              <p className="text-white/40 text-xs mt-0.5">{selected.stage !== 'TBA' ? `${selected.stage} Stage · ` : ''}{selected.day}</p>
            </div>
          </div>
        </div>
        <div className="px-5 flex flex-col gap-3">
          {REACTIONS.map(r => (
            <button key={r.key} onClick={() => { setReaction(r.key); setStep('review') }}
              className="flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all active:scale-[0.98] text-left"
              style={{background:'#161618', borderColor:'rgba(255,255,255,0.06)'}}>
              <span style={{fontSize:36}}>{r.emoji}</span>
              <div className="flex-1">
                <p className="text-white font-medium text-base">{r.label}</p>
                <p className="text-white/35 text-xs mt-0.5">{r.sublabel}</p>
              </div>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 4l4 4-4 4" stroke="rgba(255,255,255,0.2)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          ))}
        </div>
        <div className="px-5 mt-6">
          <button onClick={() => { setReaction('fine'); handleLog() }} disabled={loading}
            className="w-full text-white/20 text-sm py-3">
            Skip and just log it
          </button>
        </div>
        <BottomNav />
      </div>
    )
  }

  if (step === 'review' && selected && reaction) {
    const reactionData = REACTIONS.find(r => r.key === reaction)!
    return (
      <div className="min-h-screen pb-28">
        <div className="sticky top-0 z-40 bg-[#0c0c0e]/90 backdrop-blur-xl border-b border-white/[0.05] px-5 pt-12 pb-4 flex items-center gap-3">
          <button onClick={() => setStep('react')} className="w-9 h-9 rounded-full bg-card flex items-center justify-center text-white/40 flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/30">Step 2 of 2 · Optional</p>
            <h1 className="font-serif text-lg text-white leading-tight">Add a note</h1>
          </div>
        </div>
        <div className="mx-5 mt-4 mb-4 rounded-2xl overflow-hidden border border-white/[0.06]"
          style={{background:`linear-gradient(135deg,${DAY_COLORS[selected.day]}22,#1a1a1d)`}}>
          <div className="px-4 py-4 flex gap-4 items-center">
            <span className="text-4xl">{selected.emoji}</span>
            <div className="flex-1">
              <p className="font-medium text-white text-base">{selected.name}</p>
              <p className="text-white/40 text-xs mt-0.5">{selected.stage !== 'TBA' ? `${selected.stage} Stage · ` : ''}{selected.day}</p>
            </div>
            <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
              <span style={{fontSize:24}}>{reactionData.emoji}</span>
              <span className="text-[10px] text-white/30">{reactionData.label}</span>
            </div>
          </div>
        </div>
        <div className="mx-5 mb-4 bg-card rounded-2xl border border-white/[0.06] overflow-hidden">
          <textarea value={review} onChange={e => setReview(e.target.value)}
            placeholder="What made it unforgettable? Transcendent, chaotic, mid? Be honest."
            rows={4} maxLength={280}
            className="w-full bg-transparent px-4 pt-4 pb-2 text-white/80 text-sm placeholder:text-white/20 outline-none resize-none leading-relaxed" />
          <p className="px-4 pb-3 text-white/15 text-xs text-right">{review.length} / 280</p>
        </div>
        <div className="px-5 mb-6">
          <p className="text-[10px] uppercase tracking-widest text-white/25 mb-3">Vibe tags</p>
          <div className="flex flex-wrap gap-2">
            {TAGS.map(tag => (
              <button key={tag} onClick={() => toggleTag(tag)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${tags.includes(tag) ? 'border-brand text-brand' : 'border-white/10 text-white/35'}`}
                style={tags.includes(tag) ? {background:'rgba(212,83,126,0.1)'} : {}}>
                {tag}
              </button>
            ))}
          </div>
        </div>
        <div className="px-5">
          <button onClick={handleLog} disabled={loading}
            className="w-full text-white rounded-2xl py-4 text-sm font-medium disabled:opacity-40 active:opacity-80 transition-opacity"
            style={{background:'#D4537E'}}>
            {loading ? 'Saving…' : 'Save & rank it →'}
          </button>
          <button onClick={handleLog} disabled={loading} className="w-full mt-2 text-white/20 text-sm py-3">
            Skip note, just save
          </button>
        </div>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-28">
      <div className="sticky top-0 z-40 bg-[#0c0c0e]/90 backdrop-blur-xl border-b border-white/[0.05] px-5 pt-12 pb-4">
        <p className="text-[10px] uppercase tracking-[0.2em] text-brand/70 mb-1">Coachella 2026</p>
        <h1 className="font-serif text-2xl text-white mb-3">Log a set</h1>
        <div className="bg-card border border-white/10 rounded-xl flex items-center gap-3 px-4 py-3">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="6" cy="6" r="4.5" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2"/>
            <path d="M10 10l2.5 2.5" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          <input type="text" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search artist…"
            className="flex-1 bg-transparent text-white text-sm placeholder:text-white/25 outline-none" autoFocus />
          {query && <button onClick={() => setQuery('')} className="text-white/25 text-xs">✕</button>}
        </div>
      </div>

      <div className="px-5 pt-3 pb-2 flex gap-2 overflow-x-auto no-scrollbar">
        <button onClick={() => setDayFilter('All')}
          className={`flex-shrink-0 text-xs px-4 py-2 rounded-full border transition-all ${dayFilter === 'All' ? 'border-white/20 text-white bg-white/[0.08]' : 'border-white/[0.08] text-white/35'}`}>
          All days
        </button>
        {DAYS.map(day => (
          <button key={day} onClick={() => setDayFilter(day)}
            className="flex-shrink-0 text-xs px-4 py-2 rounded-full border transition-all"
            style={dayFilter === day
              ? {background:`${DAY_COLORS[day]}25`, borderColor:`${DAY_COLORS[day]}60`, color:DAY_COLORS[day]}
              : {borderColor:'rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.35)'}}>
            {day}
          </button>
        ))}
      </div>

      <div className="px-5 pb-2">
        <p className="text-xs text-white/20">{filtered.length} artists</p>
      </div>

      <div className="px-5 flex flex-col gap-2">
        {filtered.map(artist => {
          const logged = alreadyLogged.includes(artist.id)
          return (
            <button key={artist.id}
              onClick={() => { if (!logged) { setSelected(artist); setReaction(null); setStep('react') } }}
              className="flex items-center gap-3 w-full text-left rounded-xl border px-4 py-3 transition-all"
              style={{background:'#161618', borderColor: logged ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)', opacity: logged ? 0.45 : 1}}>
              <span className="text-2xl flex-shrink-0">{artist.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{artist.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-medium" style={{color: DAY_COLORS[artist.day]}}>{artist.day}</span>
                  <span className="text-white/20 text-[10px]">·</span>
                  <span className="text-white/30 text-[10px]">{artist.stage}</span>
                </div>
              </div>
              {logged
                ? <span className="text-xs font-medium flex-shrink-0" style={{color:'rgba(212,83,126,0.5)'}}>logged ✓</span>
                : <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0"><path d="M6 4l4 4-4 4" stroke="rgba(255,255,255,0.2)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
              }
            </button>
          )
        })}
      </div>
      <BottomNav />
    </div>
  )
}

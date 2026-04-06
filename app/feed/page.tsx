'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { eloToDisplay } from '@/lib/elo'
import BottomNav from '@/components/BottomNav'
import Link from 'next/link'

interface FeedItem {
  id: string
  artist_name: string
  stage: string
  day: string
  emoji: string
  elo: number
  review: string | null
  tags: string[] | null
  photo_url: string | null
  created_at: string
  profiles: { username: string; display_name: string }
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 2) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function scoreColor(score: string) {
  const n = parseFloat(score)
  if (n >= 9) return 'text-[#F5A623]'
  if (n >= 7.5) return 'text-brand'
  if (n >= 6) return 'text-[#E8832A]'
  return 'text-white/40'
}

export default function FeedPage() {
  const router = useRouter()
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      const { data } = await supabase
        .from('logged_shows')
        .select('*, profiles(username, display_name)')
        .order('created_at', { ascending: false })
        .limit(40)
      setFeed((data || []) as FeedItem[])
      setLoading(false)
    }
    load()
  }, [router])

  return (
    <div className="min-h-screen pb-28">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#0c0c0e]/90 backdrop-blur-xl border-b border-white/[0.05] px-5 pt-12 pb-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-brand/70 font-medium mb-1">Coachella 2026</p>
            <h1 className="font-serif text-2xl text-white">What they thought</h1>
          </div>
          <div className="w-8 h-8 rounded-full bg-card border border-white/10 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="5.5" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2"/>
              <path d="M7 4v3.5l2 2" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Weekend banner */}
      <div className="mx-5 mt-4 mb-2 rounded-2xl overflow-hidden border border-white/[0.06]" style={{background:'linear-gradient(135deg,#2a0e1a,#1a1008)'}}>
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-white/50 mb-0.5">Weekend 1</p>
            <p className="text-sm font-medium text-white">Apr 17–19, 2026 · Indio, CA</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/30 mb-0.5">logging</p>
            <p className="font-serif text-xl text-brand">{feed.length}</p>
          </div>
        </div>
      </div>

      {/* Feed */}
      <div className="px-5 pt-3 flex flex-col gap-3">
        {loading && (
          Array.from({length: 3}).map((_, i) => (
            <div key={i} className="shimmer rounded-2xl h-40" />
          ))
        )}

        {!loading && feed.length === 0 && (
          <div className="text-center py-20 fade-up">
            <p className="text-5xl mb-4">🎪</p>
            <p className="text-white/30 text-sm mb-2">No sets logged yet</p>
            <p className="text-white/15 text-xs mb-6">Be the first to rate a Coachella set</p>
            <Link href="/log" className="inline-block bg-brand text-white rounded-xl px-6 py-3 text-sm font-medium">
              Log a set →
            </Link>
          </div>
        )}

        {feed.map((item, idx) => {
          const score = eloToDisplay(item.elo)
          return (
            <div key={item.id} className="fade-up rounded-2xl overflow-hidden border border-white/[0.05]" style={{background:'#161618', animationDelay:`${idx*60}ms`}}>

              {/* Post header */}
              <div className="px-4 pt-4 pb-2 flex items-center gap-3">
                <Link href={`/u/${item.profiles?.username}`}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0"
                    style={{background:'linear-gradient(135deg,#D4537E,#C4651A)'}}>
                    {item.profiles?.display_name?.[0]?.toUpperCase() || '?'}
                  </div>
                </Link>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-white text-sm font-medium">{item.profiles?.display_name}</p>
                    <span className="text-white/20 text-xs">·</span>
                    <p className="text-white/25 text-xs">{timeAgo(item.created_at)}</p>
                  </div>
                  <p className="text-white/30 text-xs">logged a set</p>
                </div>
              </div>

              {/* Show card */}
              {item.photo_url && (
              <div className="mx-4 mb-3 rounded-xl overflow-hidden" style={{height:200}}>
                <img src={item.photo_url} alt={item.artist_name} style={{width:"100%",height:"100%",objectFit:"cover"}} />
              </div>
            )}
              <div className="mx-4 mb-3 rounded-xl px-4 py-3 flex gap-4 items-center" style={{background:"linear-gradient(135deg,#220f18,#1a1008)"}}>
                <span className="text-4xl leading-none">{item.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-base leading-tight truncate">{item.artist_name}</p>
                  <p className="text-white/35 text-xs mt-0.5">{item.stage} Stage · {item.day}</p>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className={`font-serif text-3xl ${scoreColor(score)}`}>{score}</span>
                    <span className="text-white/20 text-xs">/10</span>
                  </div>
                </div>
              </div>

              {/* Review */}
              {item.review && (
                <p className="px-4 pb-3 text-white/45 text-[13px] italic leading-relaxed">
                  "{item.review}"
                </p>
              )}

              {/* Tags */}
              {item.tags && item.tags.length > 0 && (
                <div className="px-4 pb-4 flex flex-wrap gap-1.5">
                  {item.tags.map(tag => (
                    <span key={tag} className="text-xs px-2.5 py-1 rounded-full border"
                      style={{background:'rgba(212,83,126,0.08)', borderColor:'rgba(212,83,126,0.2)', color:'rgba(212,83,126,0.8)'}}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

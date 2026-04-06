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

const DAY_COLORS: Record<string, string> = {
  Friday: '#7B5EA7',
  Saturday: '#D4537E',
  Sunday: '#C4651A',
  TBA: 'rgba(255,255,255,0.25)',
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
  if (n >= 9) return '#F5A623'
  if (n >= 7.5) return '#D4537E'
  if (n >= 6) return '#E8832A'
  return 'rgba(255,255,255,0.4)'
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
      <div className="sticky top-0 z-40 bg-[#0c0c0e]/95 backdrop-blur-xl border-b border-white/[0.06] px-5 pt-12 pb-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] font-semibold mb-1" style={{color:'rgba(212,83,126,0.7)'}}>Coachella 2026</p>
            <h1 className="font-serif text-[26px] text-white font-normal">What they thought</h1>
          </div>
        </div>
      </div>

      <div className="mx-5 mt-4 mb-3 rounded-xl overflow-hidden border border-white/[0.06]" style={{background:'linear-gradient(135deg,#1e0a14,#140a06)'}}>
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-white/40 mb-0.5">Weekend 1</p>
            <p className="text-sm font-medium text-white">Apr 17–19, 2026 · Indio, CA</p>
          </div>
          <div className="text-right">
            <p className="font-serif text-2xl" style={{color:'#D4537E'}}>{feed.length}</p>
            <p className="text-[10px] uppercase tracking-wider text-white/30">sets logged</p>
          </div>
        </div>
      </div>

      <div className="px-5 pt-1 flex flex-col gap-3">
        {loading && Array.from({length: 3}).map((_, i) => (
          <div key={i} className="shimmer rounded-xl h-36" />
        ))}

        {!loading && feed.length === 0 && (
          <div className="text-center py-20 fade-up">
            <p className="text-white/20 text-sm mb-2">No sets logged yet</p>
            <p className="text-white/12 text-xs mb-6">Be the first to rate a Coachella set</p>
            <Link href="/log" className="inline-block bg-brand text-white rounded-lg px-6 py-3 text-sm font-medium tracking-wide">
              Log a set
            </Link>
          </div>
        )}

        {feed.map((item, idx) => {
          const score = eloToDisplay(item.elo)
          const dayColor = DAY_COLORS[item.day] || 'rgba(255,255,255,0.25)'
          return (
            <div key={item.id} className="fade-up rounded-xl overflow-hidden border border-white/[0.06]"
              style={{background:'#141416', animationDelay:`${idx*50}ms`}}>

              {/* Photo */}
              {item.photo_url && (
                <div style={{height:200,overflow:'hidden'}}>
                  <img src={item.photo_url} alt={item.artist_name} style={{width:'100%',height:'100%',objectFit:'cover'}} />
                </div>
              )}

              {/* Show info */}
              <div className="px-4 pt-4 pb-3">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{background: dayColor}} />
                      <span className="text-[10px] uppercase tracking-[0.18em] font-semibold" style={{color: dayColor}}>{item.day}</span>
                      <span className="text-white/20 text-[10px]">·</span>
                      <span className="text-white/35 text-[10px] uppercase tracking-wider">{item.stage}</span>
                    </div>
                    <h3 className="font-serif text-lg text-white leading-tight">{item.artist_name}</h3>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className="font-serif text-3xl leading-none" style={{color: scoreColor(score)}}>{score}</div>
                    <div className="text-[10px] text-white/25 mt-0.5">/10</div>
                  </div>
                </div>

                {item.review && (
                  <p className="text-white/50 text-[13px] leading-relaxed italic mb-3 border-l-2 border-white/10 pl-3">
                    {item.review}
                  </p>
                )}

                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {item.tags.map(tag => (
                      <span key={tag} className="text-[11px] px-2.5 py-1 rounded border font-medium tracking-wide"
                        style={{background:'rgba(212,83,126,0.07)', borderColor:'rgba(212,83,126,0.18)', color:'rgba(212,83,126,0.75)'}}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2 border-t border-white/[0.05]">
                  <Link href={`/u/${item.profiles?.username}`}>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0"
                      style={{background:'linear-gradient(135deg,#D4537E,#C4651A)'}}>
                      {item.profiles?.display_name?.[0]?.toUpperCase() || '?'}
                    </div>
                  </Link>
                  <span className="text-white/40 text-xs font-medium">{item.profiles?.display_name}</span>
                  <span className="text-white/20 text-xs">·</span>
                  <span className="text-white/25 text-xs">{timeAgo(item.created_at)}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <BottomNav />
    </div>
  )
}

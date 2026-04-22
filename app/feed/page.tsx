'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { eloToDisplay } from '@/lib/elo'
import BottomNav from '@/components/BottomNav'

interface FeedItem {
  id: string
  artist_name: string
  stage: string
  day: string
  emoji: string
  elo: number
  review: string | null
  tags: string[] | null
  created_at: string
  profiles: { username: string; display_name: string }
}

export default function FeedPage() {
  const router = useRouter()
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'friends' | 'everyone'>('everyone')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }

      // For MVP: show everyone's recent logs
      const { data } = await supabase
        .from('logged_shows')
        .select('*, profiles(username, display_name)')
        .order('created_at', { ascending: false })
        .limit(40)

      setFeed((data || []) as FeedItem[])
      setLoading(false)
    }
    load()
  }, [router, tab])

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" /></div>
  }

  return (
    <div className="min-h-screen pb-28">
      {/* Header */}
      <div className="px-5 pt-6 pb-0 bg-[#0f0f11] border-b border-white/[0.06]">
        <h1 className="font-serif text-2xl text-white mb-4">Feed</h1>
        <div className="flex gap-0">
          {(['everyone', 'friends'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 pb-3 text-xs uppercase tracking-widest font-medium border-b-2 transition-colors capitalize ${
                tab === t ? 'text-brand border-brand' : 'text-white/30 border-transparent'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      <div className="px-5 pt-4 flex flex-col gap-4">
        {feed.length === 0 && (
          <div className="text-center py-16">
            <p className="text-white/20 text-sm">No shows logged yet.</p>
            <p className="text-white/15 text-xs mt-1">Be the first — log a set →</p>
          </div>
        )}
        {feed.map(item => (
          <div key={item.id} className="bg-card rounded-2xl border border-white/[0.06] overflow-hidden">
            {/* Post header */}
            <div className="px-4 pt-4 pb-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center text-brand text-xs font-medium flex-shrink-0">
                {item.profiles?.display_name?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="flex-1">
                <p className="text-white text-sm font-medium">{item.profiles?.display_name}</p>
                <p className="text-white/30 text-xs">logged a set · {timeAgo(item.created_at)}</p>
              </div>
            </div>

            {/* Show banner */}
            <div className="mx-4 mb-3 bg-[#200d18] rounded-xl px-4 py-3 flex gap-3 items-center border border-white/[0.04]">
              <span className="text-3xl">{item.emoji}</span>
              <div className="flex-1">
                <p className="text-white font-medium text-[15px]">{item.artist_name}</p>
                <p className="text-white/35 text-xs mt-0.5">{item.stage} Stage · {item.day}</p>
                <div className="flex items-baseline gap-1 mt-1.5">
                  <span className="font-serif text-2xl text-brand">{eloToDisplay(item.elo)}</span>
                  <span className="text-white/20 text-xs">/10</span>
                </div>
              </div>
            </div>

            {/* Review */}
            {item.review && (
              <p className="px-4 pb-3 text-white/50 text-xs italic leading-relaxed">
                "{item.review}"
              </p>
            )}

            {/* Tags */}
            {item.tags && item.tags.length > 0 && (
              <div className="px-4 pb-4 flex flex-wrap gap-1.5">
                {item.tags.map(tag => (
                  <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-brand/10 text-brand/70 border border-brand/20">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <BottomNav />
    </div>
  )
}

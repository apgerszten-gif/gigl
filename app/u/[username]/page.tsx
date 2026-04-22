import { supabase } from '@/lib/supabase'
import { eloToDisplay } from '@/lib/elo'
import { notFound } from 'next/navigation'

export default async function PublicProfile({ params }: { params: { username: string } }) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, display_name')
    .eq('username', params.username)
    .single()

  if (!profile) notFound()

  const { data: shows } = await supabase
    .from('logged_shows')
    .select('*')
    .eq('user_id', profile.id)
    .order('elo', { ascending: false })

  const medals = ['🥇', '🥈', '🥉']
  const avgScore = shows && shows.length > 0
    ? (shows.reduce((acc, s) => acc + parseFloat(eloToDisplay(s.elo)), 0) / shows.length).toFixed(1)
    : '—'

  return (
    <div className="min-h-screen pb-10 font-sans">
      {/* Header */}
      <div className="bg-[#1a0a10] px-5 pt-10 pb-0">
        <div className="flex items-end gap-4 mb-4">
          <div className="w-16 h-16 rounded-full bg-[#D4537E] flex items-center justify-center font-serif text-2xl text-white">
            {profile.display_name?.[0]?.toUpperCase()}
          </div>
          <div>
            <h1 className="font-serif text-xl text-white">{profile.display_name}</h1>
            <p className="text-white/35 text-xs mt-0.5">@{profile.username} · Coachella 2026</p>
          </div>
        </div>
        <div className="flex border-t border-white/[0.08] -mx-5">
          <div className="flex-1 py-3 text-center border-r border-white/[0.08]">
            <p className="text-lg font-medium text-white">{shows?.length || 0}</p>
            <p className="text-[10px] uppercase tracking-wider text-white/30 mt-0.5">Shows</p>
          </div>
          <div className="flex-1 py-3 text-center">
            <p className="text-lg font-medium text-white">{avgScore}</p>
            <p className="text-[10px] uppercase tracking-wider text-white/30 mt-0.5">Avg score</p>
          </div>
        </div>
      </div>

      <div className="px-5 pt-5">
        <p className="text-xs uppercase tracking-widest text-white/25 mb-3">Their rankings</p>
        <div className="flex flex-col gap-2">
          {(shows || []).map((show, i) => (
            <div key={show.id} className="bg-[#1a1a1d] border border-white/[0.06] rounded-xl px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="text-base w-5 text-center flex-shrink-0">{medals[i] || <span className="text-white/20 text-sm">{i+1}</span>}</span>
                <span className="text-xl flex-shrink-0">{show.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium">{show.artist_name}</p>
                  <p className="text-white/35 text-xs">{show.stage} · {show.day}</p>
                </div>
                <span className="font-serif text-lg text-[#D4537E] flex-shrink-0">{eloToDisplay(show.elo)}</span>
              </div>
              {show.review && (
                <p className="mt-2 ml-10 text-white/50 text-xs italic leading-relaxed">"{show.review}"</p>
              )}
              {show.tags && show.tags.length > 0 && (
                <div className="mt-2 ml-10 flex flex-wrap gap-1.5">
                  {show.tags.map((tag: string) => (
                    <span key={tag} className="text-xs px-2.5 py-0.5 rounded-full bg-[#D4537E]/10 text-[#D4537E]/70 border border-[#D4537E]/20">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <p className="text-white/20 text-xs mb-3">Want to rank your Coachella sets?</p>
          <a href="/auth" className="inline-block bg-[#D4537E] text-white rounded-xl px-6 py-3 text-sm font-medium">
            Join Gigl →
          </a>
        </div>
      </div>
    </div>
  )
}

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

  const medals = ['🥇','🥈','🥉']
  const avgScore = shows && shows.length > 0
    ? (shows.reduce((acc, s) => acc + parseFloat(eloToDisplay(s.elo)), 0) / shows.length).toFixed(1)
    : '—'

  function scoreColor(score: string) {
    const n = parseFloat(score)
    if (n >= 9) return '#F5A623'
    if (n >= 7.5) return '#D4537E'
    if (n >= 6) return '#E8832A'
    return 'rgba(255,255,255,0.3)'
  }

  return (
    <div className="min-h-screen pb-10 font-sans">
      <div style={{background:'linear-gradient(180deg,#1f0a12 0%,#0c0c0e 100%)'}}>
        <div className="px-5 pt-10 pb-0">
          <div className="flex items-end gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-serif text-2xl text-white"
              style={{background:'linear-gradient(135deg,#D4537E,#C4651A)'}}>
              {profile.display_name?.[0]?.toUpperCase()}
            </div>
            <div>
              <h1 className="font-serif text-xl text-white">{profile.display_name}</h1>
              <p className="text-white/35 text-xs mt-0.5">@{profile.username} · Coachella 2026</p>
            </div>
          </div>
          <div className="flex border-t border-white/[0.08] -mx-5">
            <div className="flex-1 py-3 text-center border-r border-white/[0.08]">
              <p className="font-serif text-lg text-white">{shows?.length || 0}</p>
              <p className="text-[10px] uppercase tracking-wider text-white/30 mt-0.5">Shows</p>
            </div>
            <div className="flex-1 py-3 text-center">
              <p className="font-serif text-lg text-white">{avgScore}</p>
              <p className="text-[10px] uppercase tracking-wider text-white/30 mt-0.5">Avg score</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 pt-5">
        <p className="text-[10px] uppercase tracking-widest text-white/25 mb-3">Their rankings</p>
        <div className="flex flex-col gap-2">
          {(shows || []).map((show, i) => {
            const score = eloToDisplay(show.elo)
            return (
              <div key={show.id} className="flex items-center gap-3 rounded-xl border border-white/[0.06] px-4 py-3"
                style={{background:'#161618'}}>
                <span className="text-base w-5 text-center">{medals[i] || `${i+1}`}</span>
                <span className="text-xl">{show.emoji}</span>
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">{show.artist_name}</p>
                  <p className="text-white/35 text-xs">{show.stage} · {show.day}</p>
                  {show.tags?.[0] && <p className="text-xs mt-0.5" style={{color:'rgba(212,83,126,0.6)'}}>{show.tags[0]}</p>}
                </div>
                <span className="font-serif text-lg" style={{color: scoreColor(score)}}>{score}</span>
              </div>
            )
          })}
        </div>

        <div className="mt-8 text-center">
          <p className="text-white/20 text-xs mb-3">Want to rank your Coachella sets?</p>
          <a href="/auth" className="inline-block text-white rounded-xl px-6 py-3 text-sm font-medium"
            style={{background:'#D4537E'}}>
            Join Gigl →
          </a>
        </div>
      </div>
    </div>
  )
}

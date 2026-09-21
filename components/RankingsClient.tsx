'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { BattleModeCard } from '@/components/BattleModeCard'
import { BattleRecordBadge } from '@/components/BattleRecordBadge'
import { AppHeader } from '@/components/AppHeader'
import BottomNav from '@/components/BottomNav'
import { FeedTabs } from '@/components/FeedTabs'
import { ArtistPhoto, Card, Chip, DateTag, EmptyState, Label, Place, Stars } from '@/components/ui'
import { useAuth } from '@/components/AuthProvider'
import { timeQuery } from '@/lib/queryTiming'
import { useArtistImages } from '@/lib/useArtistImages'
import { aggregateArtistRows, RANKINGS_SELECT, type ArtistRow } from '@/lib/rankings'

export type { ArtistRow }

export function RankingsClient({ initialRows }: { initialRows: ArtistRow[] }) {
  const router   = useRouter()
  const supabase = createClient()
  const { user, loading: authLoading } = useAuth()

  const [rows, setRows]         = useState<ArtistRow[]>(initialRows)
  const [battleModeUnlocked, setBattleModeUnlocked]   = useState(false)
  const [battleCardDismissed, setBattleCardDismissed] = useState(false)
  const [battleAggMap, setBattleAggMap] = useState<Record<string, { wins: number; losses: number }>>({})

  // Rankings has no built-in refresh — a visitor only ever saw a snapshot
  // from the moment they loaded the page. Subscribe to every insert/update/
  // delete on logged_shows and re-aggregate so a new rating anywhere shows
  // up here live, without the visitor needing to reload.
  useEffect(() => {
    const channel = supabase
      .channel('rankings-logged_shows')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'logged_shows' }, async () => {
        const { data, error } = await timeQuery('rankings:realtime-refetch', supabase
          .from('logged_shows')
          .select(RANKINGS_SELECT))
        if (!error) setRows(aggregateArtistRows(data))
      })
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [])

  // Rankings is server-rendered and user-agnostic, so battle_mode_unlocked/
  // battle_card_dismissed (needed only for the entry-point card below) are
  // fetched client-side.
  useEffect(() => {
    if (!user) return
    timeQuery('rankings:profiles', supabase.from('profiles').select('battle_mode_unlocked, battle_card_dismissed').eq('id', user.id).single())
      .then(({ data }) => {
        setBattleModeUnlocked(!!data?.battle_mode_unlocked)
        // Ratchet, never downgrade: AuthProvider hands out a new `user`
        // object on every auth event (including background token refreshes),
        // re-running this fetch — it must never un-dismiss a card the user
        // already closed this session (same fix as the feed page's card).
        setBattleCardDismissed(prev => prev || !!data?.battle_card_dismissed)
      })
  }, [user])

  function dismissBattleCard() {
    setBattleCardDismissed(true)
    if (user) {
      void supabase.from('profiles').update({ battle_card_dismissed: true }).eq('id', user.id)
    }
  }

  // The rows already arrived pre-computed from the server component — this
  // check only exists to bounce unauthenticated visitors, it never gates
  // the data itself.
  useEffect(() => {
    if (!authLoading && !user) router.push('/')
  }, [authLoading, user, router])

  // All-time record per artist, aggregated across every user's battles - a
  // public consensus view, same treatment as Feed, never any one user's own
  // record (that's Profile's job).
  useEffect(() => {
    const artistIds = rows.map(r => r.artist_id)
    if (artistIds.length === 0) return
    timeQuery(`rankings:battle_records(${artistIds.length} artists)`, supabase.from('battle_records').select('artist_id, wins, losses').in('artist_id', artistIds))
      .then(({ data }) => {
        const map: Record<string, { wins: number; losses: number }> = {}
        data?.forEach(r => {
          const cur = map[r.artist_id] ?? { wins: 0, losses: 0 }
          map[r.artist_id] = { wins: cur.wins + r.wins, losses: cur.losses + r.losses }
        })
        setBattleAggMap(map)
      })
  }, [rows])

  // One list, no day split. Splitting by day made sense when every logged
  // show came from a festival lineup and "Saturday" named a real section of
  // the event. Show search covers the whole Ticketmaster catalogue now, so a
  // day chip would be slicing a year of unrelated gigs by weekday.
  //
  // `day` still exists on rows that came from a festival and still appears in
  // the place line below - it just isn't a filter any more.
  const visible = rows

  const artistImage = useArtistImages(visible.map(r => r.name))

  function dayLabel(d: string) {
    return d.slice(0, 3).charAt(0).toUpperCase() + d.slice(1, 3)
  }

  return (
    <div className="min-h-screen bg-paper text-ink pb-28">
      <AppHeader>
        <div className="min-w-0">
          <Label>Everyone&apos;s ratings</Label>
          <h1 className="font-display text-2xl font-bold tracking-tight leading-tight">Artist rankings</h1>
        </div>
      </AppHeader>

      {/* Same control as Feed, with the rankings row selected. No
          onFilterChange here: from this page both filter options are a
          navigation back to Feed. See components/FeedTabs.tsx. */}
      <div className="px-5 pt-3">
        <FeedTabs value="rankings" />
      </div>

      <main className="px-5 pt-4 space-y-3">
        {battleModeUnlocked && !battleCardDismissed && (
          <BattleModeCard onDismiss={dismissBattleCard} onEnter={() => router.push('/battle')} />
        )}

        {visible.length === 0 && <EmptyState>No ratings yet</EmptyState>}

        {visible.map((row, i) => {
          const place = row.stage
            ? [row.stage, row.day ? dayLabel(row.day) : null].filter(Boolean).join(' · ')
            : row.venue
          return (
            <div
              key={row.artist_id}
              role="link"
              tabIndex={0}
              onClick={() => router.push(`/artist/${row.artist_id}`)}
              onKeyDown={e => { if (e.key === 'Enter') router.push(`/artist/${row.artist_id}`) }}
              className="block cursor-pointer"
            >
              <Card className="p-3 flex items-center gap-3">
                <span className="font-display text-3xl font-bold leading-none w-7 flex-shrink-0 text-center text-accent">{i + 1}</span>
                <ArtistPhoto name={row.name} src={artistImage(row.name)} className="w-14 h-14">
                  <DateTag isoDate={row.showDate} />
                </ArtistPhoto>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-base font-bold leading-tight truncate">{row.name}</h3>
                    <Stars score={row.avgScore} size={12} />
                  </div>
                  {place && (row.stage ? (
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); router.push(`/stage/${encodeURIComponent(row.stage)}`) }}
                      className="block max-w-full mt-0.5 text-left"
                    >
                      <Place>{place}</Place>
                    </button>
                  ) : (
                    <Place className="mt-0.5">{place}</Place>
                  ))}
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <Chip>{row.count} {row.count === 1 ? 'rating' : 'ratings'}</Chip>
                    {battleAggMap[row.artist_id] && (
                      <BattleRecordBadge
                        wins={battleAggMap[row.artist_id].wins}
                        losses={battleAggMap[row.artist_id].losses}
                        unlocked={battleModeUnlocked}
                        context="aggregate"
                        artistName={row.name}
                      />
                    )}
                  </div>
                </div>
              </Card>
            </div>
          )
        })}
      </main>

      <BottomNav />
    </div>
  )
}

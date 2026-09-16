import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import { computeShowScore } from '@/lib/rating'
import { Logo } from '@/components/Logo'
import { ArtistPhoto, BackHeader, Card, Chip, Label, Stars } from '@/components/ui'

function dayLabel(d: string) {
  if (!d) return ''
  return d.charAt(0).toUpperCase() + d.slice(1)
}

export default async function StagePage({ params }: { params: { stageName: string } }) {
  const stageName = decodeURIComponent(params.stageName)

  const { data: logs } = await supabase
    .from('logged_shows')
    .select('artist_id, artist_name, performance_rating, venue_rating, crowd_rating, day')
    .eq('stage', stageName)

  if (!logs || logs.length === 0) notFound()

  const map: Record<string, { name: string; scores: number[]; day: string }> = {}
  logs.forEach(l => {
    if (l.performance_rating == null || l.venue_rating == null || l.crowd_rating == null) return
    if (!map[l.artist_id]) {
      map[l.artist_id] = { name: l.artist_name ?? 'Unknown', scores: [], day: l.day ?? '' }
    }
    map[l.artist_id].scores.push(computeShowScore(l.performance_rating, l.venue_rating, l.crowd_rating))
  })

  const rows = Object.entries(map)
    .map(([artist_id, v]) => ({
      artist_id,
      name:     v.name,
      day:      v.day,
      avgScore: v.scores.reduce((a, b) => a + b, 0) / v.scores.length,
      count:    v.scores.length,
    }))
    .sort((a, b) => b.avgScore - a.avgScore)

  if (rows.length === 0) notFound()

  const totalRatings = rows.reduce((sum, r) => sum + r.count, 0)

  return (
    <div className="min-h-screen bg-paper text-ink">
      <BackHeader title={<Logo />} href="/feed" />

      <div className="px-5 pt-5 pb-24 space-y-4">
        <div>
          <Label>
            {rows.length} {rows.length === 1 ? 'artist' : 'artists'} · {totalRatings} {totalRatings === 1 ? 'rating' : 'ratings'}
          </Label>
          <h1 className="font-display text-[28px] font-bold tracking-tight leading-tight">
            {stageName}<span className="text-accent">.</span>
          </h1>
        </div>

        <div className="flex flex-col gap-3">
          {rows.map((row, i) => (
            <Link key={row.artist_id} href={`/artist/${row.artist_id}`} className="block">
              <Card className="p-3 flex items-center gap-3">
                <span className="font-display text-3xl font-bold leading-none w-7 flex-shrink-0 text-center text-accent">{i + 1}</span>
                <ArtistPhoto name={row.name} className="w-12 h-12" iconSize={16} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-[15px] font-bold leading-tight truncate">{row.name}</h3>
                    <Stars score={row.avgScore} size={12} />
                  </div>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    {row.day && <Chip>{dayLabel(row.day)}</Chip>}
                    <Chip>{row.count} {row.count === 1 ? 'rating' : 'ratings'}</Chip>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

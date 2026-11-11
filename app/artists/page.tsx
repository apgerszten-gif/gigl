import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { artistHistory } from '@/lib/shows/history'
import { ShowsPage } from '@/components/ShowsPage'

// /artists?name=Turnstile - every show Gigl has for one artist, coming up and
// past, opened from the Feed's search. Not /artist/<id>, which is one show's
// page of reviews.

// Read fresh on every visit: Next 14 would otherwise keep the first answer
// to every Supabase read forever (see app/api/shows/search/route.ts).
export const dynamic = 'force-dynamic'
export const fetchCache = 'default-no-store'

interface Props { searchParams: { name?: string | string[] } }

function nameFrom(searchParams: Props['searchParams']): string {
  const value = Array.isArray(searchParams.name) ? searchParams.name[0] : searchParams.name
  return (value ?? '').trim().slice(0, 200)
}

export function generateMetadata({ searchParams }: Props): Metadata {
  const name = nameFrom(searchParams)
  return name ? { title: `${name} shows on Gigl` } : {}
}

export default async function ArtistShowsPage({ searchParams }: Props) {
  const name = nameFrom(searchParams)
  if (!name) notFound()

  const history = await artistHistory(name)
  return (
    <ShowsPage
      kind="artist"
      name={history.name}
      photo={history.photo}
      upcoming={history.upcoming}
      past={history.past}
      ratings={history.ratings}
      overall={history.overall}
    />
  )
}

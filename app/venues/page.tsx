import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { venueHistory } from '@/lib/shows/history'
import { ShowsPage } from '@/components/ShowsPage'

// /venues?name=The%20Fillmore&city=San%20Francisco&state=CA - every show the
// catalogue has at one venue, coming up and in the past year, opened from the
// Feed's search. City and state pick out one room when the name is shared.

// See app/artists/page.tsx.
export const dynamic = 'force-dynamic'
export const fetchCache = 'default-no-store'

type Param = string | string[] | undefined
interface Props { searchParams: { name?: Param; city?: Param; state?: Param } }

function read(value: Param): string {
  return ((Array.isArray(value) ? value[0] : value) ?? '').trim().slice(0, 200)
}

export function generateMetadata({ searchParams }: Props): Metadata {
  const name = read(searchParams.name)
  return name ? { title: `${name} shows on Gigl` } : {}
}

export default async function VenueShowsPage({ searchParams }: Props) {
  const name = read(searchParams.name)
  if (!name) notFound()

  const history = await venueHistory(name, read(searchParams.city) || null, read(searchParams.state) || null)
  return (
    <ShowsPage
      kind="venue"
      name={history.name}
      city={history.city}
      state={history.state}
      upcoming={history.upcoming}
      past={history.past}
      ratings={history.ratings}
      overall={history.overall}
    />
  )
}

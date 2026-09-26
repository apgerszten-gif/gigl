import { NextRequest, NextResponse } from 'next/server'
import { suggestValues, type SuggestField } from '@/lib/shows/repository'

// GET /api/shows/suggest?field=artist|venue|city&q=turn
//
// Values already in the catalogue, for the add-a-show form. Replaces the
// artist-only /api/artists/search: venues and cities fragment on spelling
// exactly as artists do - "The Fillmore" against "Fillmore SF" against
// "the fillmore" - and one route beats three near-identical ones.
//
// Public data through the anon key, so it keeps working without the service
// role key configured. The form is useless if its suggestions are down.

// Next 14 puts any fetch without explicit cache options into the Data Cache
// with no expiry, supabase-js requests included, so this would otherwise
// serve one visitor's first query to everybody forever.
export const fetchCache = 'default-no-store'

const FIELDS: SuggestField[] = ['artist', 'venue', 'city']

function readField(value: string | null): SuggestField | null {
  return FIELDS.includes(value as SuggestField) ? (value as SuggestField) : null
}

export async function GET(req: NextRequest) {
  const field = readField(req.nextUrl.searchParams.get('field'))
  const q = req.nextUrl.searchParams.get('q') ?? ''

  if (!field) {
    return NextResponse.json({ error: `field must be one of ${FIELDS.join(', ')}` }, { status: 400 })
  }

  try {
    const suggestions = await suggestValues(field, q)
    return NextResponse.json({ suggestions })
  } catch (err) {
    console.error('shows/suggest failed:', err)
    // Empty rather than an error status: the form must stay usable with no
    // suggestions at all, since typing something nobody has logged yet is
    // the whole reason the page exists.
    return NextResponse.json({ suggestions: [] })
  }
}

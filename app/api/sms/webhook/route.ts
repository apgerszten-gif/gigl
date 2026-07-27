import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getFestival, getArtistsByDay } from '@/lib/festivals'
import { computeShowScore, deriveLegacyEmoji } from '@/lib/rating'
import { parseLogMessage, resolveFestivalDay, matchArtist } from '@/lib/smsMatching'
import { isValidTwilioRequest } from '@/lib/twilioSignature'

function twiml(message: string): NextResponse {
  const escaped = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  const xml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escaped}</Message></Response>`
  return new NextResponse(xml, { status: 200, headers: { 'Content-Type': 'text/xml' } })
}

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const params: Record<string, string> = {}
  formData.forEach((value, key) => { params[key] = value.toString() })

  const signature = req.headers.get('X-Twilio-Signature')
  const authToken = process.env.TWILIO_AUTH_TOKEN!
  if (!isValidTwilioRequest(req.url, params, signature, authToken)) {
    console.error('SMS webhook: invalid Twilio signature, rejecting request')
    return new NextResponse('Invalid signature', { status: 403 })
  }

  const from = params['From'] ?? ''
  const body = (params['Body'] ?? '').trim()

  // 1. Look up the sender
  const { data: profile } = await supabaseAdmin()
    .from('profiles')
    .select('id, active_festival_id')
    .eq('phone_number', from)
    .eq('phone_verified', true)
    .maybeSingle()

  if (!profile) {
    return twiml("This number isn't linked to a Gigl account yet. Add it under Profile > SMS Scoring in the app.")
  }

  // 2. Parse "Artist Name Performance Venue Vibe"
  const parsed = parseLogMessage(body)
  if (!parsed) {
    return twiml('Format: Artist Performance Venue Vibe, each 1-5. e.g. Tate McRae 5 4 5')
  }
  const { artistNameRaw, performance, venue, vibe } = parsed

  // 3. Active festival + today's day, in the festival's own local time
  if (!profile.active_festival_id) {
    return twiml('Pick a festival in the Gigl app first (Profile > Switch festival), then text your rating again.')
  }
  const festival = getFestival(profile.active_festival_id)
  if (!festival) {
    return twiml("We couldn't find your selected festival. Please reselect it in the app.")
  }
  const day = resolveFestivalDay(festival)
  if (!day) {
    return twiml(`${festival.shortName} isn't happening today as far as we can tell. Double-check your festival in the app.`)
  }

  // 4. Fuzzy-match the artist against today's lineup
  const dayArtists = getArtistsByDay(festival, day)
  const match = matchArtist(artistNameRaw, dayArtists)

  if (match.type === 'none') {
    return twiml(`Couldn't find "${artistNameRaw}" in today's ${festival.shortName} lineup. Check spelling, e.g. Tate McRae 5 4 5`)
  }
  if (match.type === 'ambiguous') {
    return twiml(`Which one did you mean? ${match.candidates.map(a => a.name).join(', ')}`)
  }
  const artist = match.artist

  // 5. Upsert the rating
  const score = computeShowScore(performance, venue, vibe)
  const { error } = await supabaseAdmin().from('logged_shows').upsert({
    user_id:            profile.id,
    artist_id:          artist.id,
    artist_name:        artist.name,
    stage:              artist.stage,
    day:                artist.day,
    performance_rating: performance,
    venue_rating:       venue,
    vibe_rating:        vibe,
    emoji:              deriveLegacyEmoji(score),
    sms_logged:         true,
  }, { onConflict: 'user_id,artist_id' })

  if (error) {
    console.error('SMS webhook upsert failed:', error.message)
    return twiml('Something went wrong saving that rating. Please try again in a bit.')
  }

  // 6. Confirm
  return twiml(`✓ Logged ${artist.name} — ${performance}/${venue}/${vibe} (${score.toFixed(1)}★) at ${festival.shortName}`)
}

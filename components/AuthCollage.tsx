import { ArtistPhoto, Card, DateTag, PersonPhoto, Place, PullQuote, Stars } from '@/components/ui'

// Turnstile's photo from their Ticketmaster attraction (K8vZ9173bFV), the
// 640px 3:2 crop pickImage in lib/ticketmaster.ts would choose. Fixed here
// rather than read from artist_images, so the sign-in page never waits on a
// query for a decoration.
const TURNSTILE_PHOTO =
  'https://s1.ticketm.net/dam/a/a37/9a486633-4306-4fcb-a0ea-3e4c84d01a37_RETINA_PORTRAIT_3_2.jpg'

// A cut-and-paste collage of the app's own cards, at the top of sign-in
// (app/auth and its email fallback, components/EmailAuthPage.tsx).
export function AuthCollage() {
  return (
    <div className="relative h-[168px] mt-5 mb-4" aria-hidden>
      <Card className="absolute left-0 right-8 top-0 -rotate-2 p-3 flex items-center gap-3">
        <ArtistPhoto name="Turnstile" src={TURNSTILE_PHOTO} className="w-14 h-14" iconSize={18}>
          <DateTag isoDate="2026-09-24" />
        </ArtistPhoto>
        <div className="min-w-0 space-y-1">
          <p className="font-display text-lg font-bold leading-none">Turnstile</p>
          <Place>Hollywood Palladium</Place>
          <Stars score={5} size={13} />
        </div>
      </Card>
      <Card className="absolute left-10 right-0 top-[92px] rotate-[1.5deg] p-3 space-y-2">
        <PullQuote>The pit never stopped moving.</PullQuote>
        <div className="flex items-center gap-1.5">
          <PersonPhoto name="mauricio_pochettino" className="w-5 h-5 text-[10px] border border-ink/15" />
          <span className="text-[11px] text-ink-muted">@mauricio_pochettino</span>
        </div>
      </Card>
    </div>
  )
}

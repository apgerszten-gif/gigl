import { ImageResponse } from 'next/og'

// The 1200×630 link preview for shared shows and reviews: a cream riso card
// on paper, the artist photo with a date sticker, and a few lines of text.
// Stars are drawn as ★ characters, filled to the nearest whole star.

const PAPER = '#EDE3D0'
const CREAM = '#FAF3E2'
const INK = '#4A3528'
const MUTED = '#8B7560'
const ACCENT = '#B85827'

export interface OgCardContent {
  chip?:     string | null
  title:     string
  place?:    string | null
  imageUrl?: string | null
  isoDate?:  string | null
  // Out of 5; null hides the stars, 'hidden' shows "?????".
  stars?:    number | 'hidden' | null
  quote?:    string | null
}

function dateParts(isoDate: string | null | undefined) {
  if (!isoDate) return null
  const d = new Date(`${isoDate}T00:00:00Z`)
  if (isNaN(d.getTime())) return null
  return {
    month: d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase(),
    day:   String(d.getUTCDate()),
  }
}

export function ogCard(content: OgCardContent): ImageResponse {
  const date = dateParts(content.isoDate)
  const filled = typeof content.stars === 'number' ? Math.round(content.stars) : 0

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: PAPER, padding: 48, fontFamily: 'sans-serif' }}>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 48, background: CREAM, border: `4px solid ${INK}`,
          borderRadius: 12, boxShadow: `10px 10px 0 ${INK}`, padding: 44,
        }}>
          <div style={{ position: 'relative', display: 'flex', width: 360, height: 360, flexShrink: 0 }}>
            <div style={{ display: 'flex', width: 360, height: 360, border: `4px solid ${INK}`, borderRadius: 12, overflow: 'hidden', background: 'rgba(212,132,90,0.3)' }}>
              {content.imageUrl
                ? <img src={content.imageUrl} width={360} height={360} style={{ objectFit: 'cover', width: 360, height: 360 }} />
                : <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', fontSize: 120, color: 'rgba(74,53,40,0.45)' }}>♪</div>}
            </div>
            {date && (
              <div style={{
                position: 'absolute', right: -22, bottom: -22, display: 'flex', flexDirection: 'column', alignItems: 'center',
                background: CREAM, border: `4px solid ${INK}`, borderRadius: 8, boxShadow: `5px 5px 0 ${INK}`, padding: '8px 16px',
                transform: 'rotate(-3deg)',
              }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: MUTED, letterSpacing: 2 }}>{date.month}</div>
                <div style={{ fontSize: 48, fontWeight: 800, color: INK, lineHeight: 1 }}>{date.day}</div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, gap: 16 }}>
            {content.chip && (
              <div style={{ display: 'flex' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: ACCENT, background: 'rgba(184,88,39,0.1)', border: '3px solid rgba(184,88,39,0.3)', borderRadius: 6, padding: '6px 14px', textTransform: 'uppercase', letterSpacing: 2 }}>
                  {content.chip}
                </div>
              </div>
            )}
            <div style={{ fontSize: content.title.length > 24 ? 56 : 72, fontWeight: 800, color: INK, lineHeight: 1.02, letterSpacing: -2 }}>{content.title}</div>
            {content.place && <div style={{ fontSize: 30, color: MUTED }}>{content.place}</div>}
            {content.stars === 'hidden' && <div style={{ fontSize: 48, fontWeight: 800, color: ACCENT, letterSpacing: 10 }}>?????</div>}
            {typeof content.stars === 'number' && (
              <div style={{ display: 'flex', fontSize: 52, color: ACCENT, letterSpacing: 4 }}>
                {'★'.repeat(filled)}<span style={{ color: 'rgba(184,88,39,0.28)' }}>{'★'.repeat(5 - filled)}</span>
              </div>
            )}
            {content.quote && (
              <div style={{ display: 'flex', borderLeft: `6px solid ${ACCENT}`, paddingLeft: 18, fontSize: 30, color: INK, lineHeight: 1.3 }}>
                “{content.quote.length > 90 ? `${content.quote.slice(0, 88).trim()}…` : content.quote}”
              </div>
            )}
            <div style={{ display: 'flex', marginTop: 'auto', fontSize: 34, fontWeight: 800, color: INK }}>
              Gigl<span style={{ color: ACCENT }}>/</span>
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630, headers: { 'Cache-Control': 'public, max-age=300, s-maxage=300' } },
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ARTISTS, DAY_DATES, type Artist } from '@/lib/artists'
import { createClient } from '@/lib/supabase/client'

// ── Reaction step ────────────────────────────────────────────────────────────

const REACTIONS = [
  { value: 'loved' as const, emoji: '👍', label: 'Loved it' },
  { value: 'ok'    as const, emoji: '🤷', label: 'It was ok' },
  { value: 'skip'  as const, emoji: '👎', label: 'Didn\'t go' },
]

// Elo seeds are applied internally; NOT shown to user per product decision
const ELO_SEEDS = { loved: 1600, ok: 1500, skip: 1400 }

interface LogShowPageProps {
  params: { artistId: string }
}

export default function LogShowPage({ params }: LogShowPageProps) {
  const router = useRouter()
  const supabase = createClient()

  const artist = ARTISTS.find(a => a.id === params.artistId)
  const [reaction, setReaction] = useState<'loved' | 'ok' | 'skip' | null>(null)
  const [note, setNote]         = useState('')
  const [saving, setSaving]     = useState(false)

  if (!artist) return null

  const dayDate = DAY_DATES[artist.day]

  async function handleLog() {
    if (!reaction || !artist) return
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const initialElo = ELO_SEEDS[reaction]

    await supabase.from('show_logs').upsert({
      user_id:    user.id,
      artist_id:  artist.id,
      reaction,
      note:       note.trim() || null,
      elo:        initialElo,
      logged_at:  new Date().toISOString(),
    }, { onConflict: 'user_id,artist_id' })

    setSaving(false)
    router.push('/feed')
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#131313',
      fontFamily: "'Manrope', sans-serif",
      color: '#f5ebe3',
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 24px',
      }}>
        <button
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="#e0c0b2" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span style={{
          fontFamily: "'Noto Serif', Georgia, serif",
          fontSize: 15, fontWeight: 700, color: '#D35400',
          letterSpacing: '0.08em', textTransform: 'uppercase',
        }}>Gigl</span>
        <div style={{ width: 18 }} />
      </div>

      {/* Body */}
      <div style={{ padding: '0 24px 40px' }}>
        {/* Step label */}
        <div style={{
          fontSize: 10, color: '#D35400', letterSpacing: '0.12em',
          textTransform: 'uppercase', marginBottom: 8,
        }}>
          Log a Show
        </div>

        {/* Headline */}
        <div style={{
          fontFamily: "'Noto Serif', Georgia, serif",
          fontSize: 34, fontWeight: 700, lineHeight: 1.1,
          letterSpacing: '-0.02em', marginBottom: 6,
        }}>
          How was<br />
          <span style={{ color: '#D35400', fontStyle: 'italic' }}>{artist.name}?</span>
        </div>

        {/* Meta */}
        <div style={{
          fontSize: 10, color: '#594238', letterSpacing: '0.08em',
          textTransform: 'uppercase', marginBottom: 36,
        }}>
          {artist.stage} · {dayDate}
        </div>

        {/* Reaction cards — no Elo seeds shown */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
          gap: 10, marginBottom: 36,
        }}>
          {REACTIONS.map(r => (
            <button
              key={r.value}
              onClick={() => setReaction(r.value)}
              style={{
                background: reaction === r.value ? '#2a1a00' : '#1a1a1a',
                border: reaction === r.value
                  ? '1.5px solid #D35400'
                  : '1.5px solid transparent',
                borderRadius: 16,
                padding: '20px 12px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 8 }}>{r.emoji}</div>
              <div style={{
                fontSize: 11, fontWeight: 700,
                color: reaction === r.value ? '#D35400' : '#e0c0b2',
                letterSpacing: '0.06em', textTransform: 'uppercase',
                fontFamily: "'Manrope', sans-serif",
              }}>
                {r.label}
              </div>
            </button>
          ))}
        </div>

        {/* Note field */}
        <div style={{
          fontSize: 10, color: '#594238', letterSpacing: '0.1em',
          textTransform: 'uppercase', marginBottom: 10,
        }}>
          Add a note <span style={{ color: '#353534' }}>(optional)</span>
        </div>

        <div style={{
          background: '#1a1a1a', borderRadius: 12, padding: '14px 16px',
          marginBottom: 8,
        }}>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="The energy when they opened with..."
            rows={3}
            style={{
              width: '100%', background: 'none', border: 'none', outline: 'none',
              resize: 'none', fontSize: 13, color: note ? '#e0c0b2' : '#353534',
              fontFamily: "'Manrope', sans-serif", lineHeight: 1.6,
              fontStyle: note ? 'normal' : 'italic',
            }}
          />
        </div>

        {/* Orange underline focus accent */}
        <div style={{
          height: 2, background: '#D35400', borderRadius: 1,
          width: '60%', marginBottom: 36,
        }} />

        {/* CTA */}
        <button
          onClick={handleLog}
          disabled={!reaction || saving}
          style={{
            width: '100%', background: reaction ? '#D35400' : '#252220',
            border: 'none', borderRadius: 12, padding: 14,
            textAlign: 'center', cursor: reaction ? 'pointer' : 'not-allowed',
            transition: 'background 0.2s ease',
          }}
        >
          <span style={{
            fontSize: 12, fontWeight: 700, color: reaction ? '#fff' : '#594238',
            letterSpacing: '0.1em', textTransform: 'uppercase',
            fontFamily: "'Manrope', sans-serif",
          }}>
            {saving ? 'Saving...' : 'Log this show'}
          </span>
        </button>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button
            onClick={() => router.back()}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 11, color: '#353534', letterSpacing: '0.06em',
              textTransform: 'uppercase', fontFamily: "'Manrope', sans-serif",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

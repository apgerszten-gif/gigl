'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/components/FestivalThemeProvider'

interface MyGroup {
  id: string
  name: string
  invite_code: string
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

export default function GroupsPage() {
  const router = useRouter()
  const supabase = createClient()
  const T = useTheme()

  const [groups, setGroups]         = useState<MyGroup[]>([])
  const [loading, setLoading]       = useState(true)
  const [newGroupName, setNewGroupName] = useState('')
  const [joinCode, setJoinCode]     = useState('')
  const [creating, setCreating]     = useState(false)
  const [joining, setJoining]       = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }

    const { data } = await supabase
      .from('group_members')
      .select('groups(id, name, invite_code)')
      .eq('user_id', user.id)

    if (data) {
      setGroups(data.map((r: any) => r.groups).filter(Boolean))
    }
    setLoading(false)
  }

  async function createGroup() {
    if (!newGroupName.trim()) return
    setCreating(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setCreating(false); return }

    const code = generateInviteCode()
    const { data: group, error } = await supabase
      .from('groups')
      .insert({ name: newGroupName.trim(), invite_code: code, created_by: user.id })
      .select()
      .single()

    if (error || !group) { alert('Error creating group: ' + error?.message); setCreating(false); return }

    const { error: joinError } = await supabase
      .from('group_members')
      .insert({ group_id: group.id, user_id: user.id })

    if (joinError) { alert('Error joining group: ' + joinError.message); setCreating(false); return }

    setCreating(false)
    router.push(`/groups/${group.id}`)
  }

  async function joinGroup() {
    if (!joinCode.trim()) return
    setJoining(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setJoining(false); return }

    const { data: group, error } = await supabase
      .from('groups')
      .select('id, name')
      .eq('invite_code', joinCode.trim().toUpperCase())
      .single()

    if (error || !group) { alert('No group found with that code'); setJoining(false); return }

    const { error: joinError } = await supabase
      .from('group_members')
      .insert({ group_id: group.id, user_id: user.id })

    if (joinError && !joinError.message.toLowerCase().includes('duplicate')) {
      alert('Error joining group: ' + joinError.message); setJoining(false); return
    }

    setJoining(false)
    router.push(`/groups/${group.id}`)
  }

  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: T.sans, color: '#4A3528', maxWidth: 430, margin: '0 auto' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '18px 24px',
        borderBottom: '1px solid rgba(74,53,40,0.1)',
      }}>
        <button onClick={() => router.push('/profile')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span style={{ fontFamily: T.serif, fontSize: 15, fontWeight: 700, color: '#4A3528' }}>Groups</span>
      </div>

      <div style={{ padding: '24px 24px 100px' }}>
        <div style={{
          fontSize: 10, color: T.accent, letterSpacing: '0.14em',
          textTransform: 'uppercase', fontWeight: 700, marginBottom: 8,
        }}>Your groups</div>
        <div style={{
          fontFamily: T.serif, fontSize: 28, fontWeight: 700, lineHeight: 1.1,
          letterSpacing: '-1px', marginBottom: 24, color: '#4A3528',
        }}>
          See just<br />
          <span>your crew&apos;s</span><span style={{ color: T.accent }}>.</span>
        </div>

        {loading ? (
          <div style={{
            textAlign: 'center', padding: 32, fontSize: 11, color: T.faint,
            letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600,
          }}>Loading...</div>
        ) : groups.length === 0 ? (
          <div style={{
            background: T.card, borderRadius: 5, border: T.cardBorder,
            padding: 24, textAlign: 'center', marginBottom: 24,
          }}>
            <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6 }}>
              You&apos;re not in a group yet — start one or join with a code below.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            {groups.map(g => (
              <button key={g.id} onClick={() => router.push(`/groups/${g.id}`)} style={{
                background: T.card, border: T.cardBorder, borderRadius: 5,
                padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                cursor: 'pointer', textAlign: 'left', width: '100%',
              }}>
                <span style={{ fontFamily: T.serif, fontSize: 15, fontWeight: 700, color: '#4A3528' }}>{g.name}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.faint} strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            ))}
          </div>
        )}

        <div style={{ background: T.card, borderRadius: 5, border: T.cardBorder, padding: '16px 18px', marginBottom: 16 }}>
          <div style={{
            fontSize: 10, color: T.muted, letterSpacing: '0.12em',
            textTransform: 'uppercase', fontWeight: 700, marginBottom: 10,
          }}>Start a group</div>
          <input
            value={newGroupName}
            onChange={e => setNewGroupName(e.target.value)}
            placeholder="e.g. The Squad"
            style={{
              width: '100%', background: T.cardInner, border: '1px solid rgba(74,53,40,0.15)',
              borderRadius: 5, padding: '10px 12px', fontSize: 14, fontFamily: T.sans,
              color: '#4A3528', outline: 'none', marginBottom: 10, boxSizing: 'border-box',
            }}
          />
          <button onClick={createGroup} disabled={creating || !newGroupName.trim()} style={{
            width: '100%', background: T.accent, border: '1.5px solid #4A3528', boxShadow: T.cardShadow,
            borderRadius: 5, padding: 12, cursor: creating ? 'default' : 'pointer',
            opacity: newGroupName.trim() ? 1 : 0.5,
          }}>
            <span style={{
              fontSize: 11, fontWeight: 700, color: '#FAF3E2',
              letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: T.sans,
            }}>{creating ? 'Creating...' : 'Create group'}</span>
          </button>
        </div>

        <div style={{ background: T.card, borderRadius: 5, border: T.cardBorder, padding: '16px 18px' }}>
          <div style={{
            fontSize: 10, color: T.muted, letterSpacing: '0.12em',
            textTransform: 'uppercase', fontWeight: 700, marginBottom: 10,
          }}>Join with a code</div>
          <input
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            placeholder="6-character code"
            style={{
              width: '100%', background: T.cardInner, border: '1px solid rgba(74,53,40,0.15)',
              borderRadius: 5, padding: '10px 12px', fontSize: 14, fontFamily: T.sans,
              color: '#4A3528', outline: 'none', marginBottom: 10, letterSpacing: '0.1em',
              boxSizing: 'border-box',
            }}
          />
          <button onClick={joinGroup} disabled={joining || !joinCode.trim()} style={{
            width: '100%', background: 'none', border: '1.5px solid #4A3528',
            borderRadius: 5, padding: 12, cursor: joining ? 'default' : 'pointer',
            opacity: joinCode.trim() ? 1 : 0.5,
          }}>
            <span style={{
              fontSize: 11, fontWeight: 700, color: '#4A3528',
              letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: T.sans,
            }}>{joining ? 'Joining...' : 'Join group'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

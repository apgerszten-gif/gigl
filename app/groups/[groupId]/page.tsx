'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ARTISTS } from '@/lib/artists'
import { createClient } from '@/lib/supabase/client'
import { eloToDisplay } from '@/lib/elo'
import { useTheme } from '@/components/FestivalThemeProvider'

interface GroupLog {
  artist_id:   string
  artist_name: string
  stage:       string
  day:         string
  elo:         number
  review:      string | null
  user_id:     string
  username:    string
  created_at:  string
}

export default function GroupDetailPage() {
  const router   = useRouter()
  const params   = useParams()
  const groupId  = params.groupId as string
  const supabase = createClient()
  const T = useTheme()

  const [groupName, setGroupName]     = useState('')
  const [inviteCode, setInviteCode]   = useState('')
  const [members, setMembers]         = useState<string[]>([])
  const [logs, setLogs]               = useState<GroupLog[]>([])
  const [loading, setLoading]         = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [copied, setCopied]           = useState(false)

  useEffect(() => { load() }, [groupId])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    setCurrentUserId(user.id)

    const { data: group } = await supabase
      .from('groups')
      .select('name, invite_code')
      .eq('id', groupId)
      .single()

    if (!group) { router.push('/groups'); return }
    setGroupName(group.name)
    setInviteCode(group.invite_code)

    const { data: memberRows } = await supabase
      .from('group_members')
      .select('user_id, profiles(username)')
      .eq('group_id', groupId)

    const memberIds = memberRows?.map(m => m.user_id) ?? []
    const usernameMap: Record<string, string> = {}
    memberRows?.forEach((m: any) => { usernameMap[m.user_id] = m.profiles?.username ?? 'anonymous' })
    setMembers(memberRows?.map((m: any) => m.profiles?.username ?? 'unknown') ?? [])

    if (memberIds.length > 0) {
      const { data: showLogs } = await supabase
        .from('logged_shows')
        .select('artist_id, artist_name, stage, day, elo, review, user_id, created_at')
        .in('user_id', memberIds)
        .order('created_at', { ascending: false })

      setLogs((showLogs ?? []).map(l => ({ ...l, username: usernameMap[l.user_id] ?? 'anonymous' })))
    }

    setLoading(false)
  }

  async function leaveGroup() {
    if (!currentUserId) return
    await supabase.from('group_members').delete().match({ group_id: groupId, user_id: currentUserId })
    router.push('/groups')
  }

  async function copyCode() {
    await navigator.clipboard.writeText(inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function dayLabel(day: string) {
    return day ? day.charAt(0).toUpperCase() + day.slice(1) : ''
  }

  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: T.sans, color: '#4A3528', maxWidth: 430, margin: '0 auto' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '18px 24px',
        borderBottom: '1px solid rgba(74,53,40,0.1)',
      }}>
        <button onClick={() => router.push('/groups')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span style={{ fontFamily: T.serif, fontSize: 15, fontWeight: 700, color: '#4A3528' }}>{groupName || 'Group'}</span>
      </div>

      <div style={{ padding: '20px 24px 100px' }}>
        <div style={{
          background: T.card, border: T.cardBorder, borderRadius: 5,
          padding: '14px 16px', marginBottom: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 9, color: T.muted, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 3 }}>Invite code</div>
            <div style={{ fontFamily: T.serif, fontSize: 18, fontWeight: 700, letterSpacing: '0.1em', color: T.accent }}>{inviteCode}</div>
          </div>
          <button onClick={copyCode} style={{
            background: 'none', border: '1px solid rgba(74,53,40,0.2)', borderRadius: 5,
            padding: '8px 14px', cursor: 'pointer', fontSize: 11, color: T.muted, fontFamily: T.sans,
          }}>{copied ? 'Copied!' : 'Copy'}</button>
        </div>

        <div style={{ fontSize: 11, color: T.muted, marginBottom: 20, lineHeight: 1.6 }}>
          {members.length} {members.length === 1 ? 'member' : 'members'}: {members.map(m => `@${m}`).join(', ')}
        </div>

        <div style={{
          fontSize: 10, color: T.accent, letterSpacing: '0.12em',
          textTransform: 'uppercase', fontWeight: 700, marginBottom: 12,
        }}>Group activity</div>

        {loading ? (
          <div style={{
            textAlign: 'center', padding: 32, fontSize: 11, color: T.faint,
            letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600,
          }}>Loading...</div>
        ) : logs.length === 0 ? (
          <div style={{ background: T.card, borderRadius: 5, border: T.cardBorder, padding: 24, textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6 }}>Nobody in this group has logged a show yet.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {logs.map((log, i) => {
              const artist = ARTISTS.find(a => a.id === log.artist_id)
              const name   = artist?.name  ?? log.artist_name
              const stage  = artist?.stage ?? log.stage
              const day    = artist?.day   ?? log.day
              return (
                <div key={i} style={{
                  background: T.card, borderRadius: 5, border: T.cardBorder,
                  padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center',
                }}>
                  <div style={{
                    width: 44, height: 44, flexShrink: 0, borderRadius: 4,
                    background: T.accent, border: '1.5px solid #4A3528',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontFamily: T.serif, fontSize: 15, fontWeight: 700, color: '#FAF3E2' }}>
                      {eloToDisplay(log.elo)}
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: T.serif, fontSize: 14, fontWeight: 700, color: '#4A3528' }}>{name}</div>
                    <div style={{
                      fontSize: 9, color: T.muted, letterSpacing: '0.06em',
                      textTransform: 'uppercase', fontFamily: T.sans, marginTop: 2,
                    }}>{stage}{day ? ` · ${dayLabel(day)}` : ''}</div>
                    <div style={{ fontSize: 10, color: T.accent, marginTop: 2, fontWeight: 600 }}>@{log.username}</div>
                    {log.review && (
                      <div style={{ fontSize: 11, color: 'rgba(74,53,40,0.6)', fontStyle: 'italic', marginTop: 4, lineHeight: 1.4 }}>
                        &ldquo;{log.review}&rdquo;
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <button onClick={leaveGroup} style={{
          width: '100%', background: 'none', border: '1px solid rgba(160,40,40,0.3)',
          borderRadius: 5, padding: 12, cursor: 'pointer', marginTop: 24,
        }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(160,40,40,0.7)', fontFamily: T.sans }}>Leave group</span>
        </button>
      </div>
    </div>
  )
}

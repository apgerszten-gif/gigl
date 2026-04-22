'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { eloToDisplay } from '@/lib/elo'
import BottomNav from '@/components/BottomNav'
import Link from 'next/link'

const SUPABASE_STORAGE = 'https://djjqrjljgwnvwwzbbevp.supabase.co/storage/v1/object/public/show-photos'

const TAGS = ['transcendent', 'intimate', 'chaotic', 'nostalgic', 'epic', 'euphoric', 'sleeper hit', 'top 3', 'made me cry', 'peak performance']

function resolvePhotoUrl(url: string | null): string | null {
  if (!url) return null
  if (url.startsWith('http')) return url
  return `${SUPABASE_STORAGE}/${url}`
}

interface Show {
  id: string
  artist_name: string
  stage: string
  day: string
  emoji: string
  elo: number
  review: string | null
  tags: string[] | null
  photo_url: string | null
}

interface Profile {
  username: string
  display_name: string
}

function scoreColor(score: string) {
  const n = parseFloat(score)
  if (n >= 9) return '#F5A623'
  if (n >= 7.5) return '#D4537E'
  if (n >= 6) return '#E8832A'
  return 'rgba(255,255,255,0.3)'
}

const DesertHeader = ({ profile, shows, onSignOut }: { profile: Profile | null, shows: Show[], onSignOut: () => void }) => {
  const avgScore = shows.length > 0
    ? (shows.reduce((acc, s) => acc + parseFloat(eloToDisplay(s.elo)), 0) / shows.length).toFixed(1)
    : null

  return (
    <div style={{position:'relative',overflow:'hidden'}}>
      <svg width="100%" height="220" viewBox="0 0 390 220" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
        <rect width="390" height="220" fill="#08040f"/>
        <rect width="390" height="140" fill="#0e0620"/>
        <ellipse cx="195" cy="150" rx="300" ry="80" fill="#3a0e1c" opacity="0.9"/>
        <ellipse cx="195" cy="162" rx="220" ry="60" fill="#6a1828" opacity="0.7"/>
        <ellipse cx="195" cy="172" rx="160" ry="45" fill="#b83a18" opacity="0.45"/>
        <ellipse cx="195" cy="180" rx="110" ry="32" fill="#e06c20" opacity="0.3"/>
        <circle cx="40" cy="18" r="1" fill="white" opacity="0.8"/>
        <circle cx="120" cy="10" r="0.7" fill="white" opacity="0.6"/>
        <circle cx="210" cy="16" r="1.1" fill="white" opacity="0.9"/>
        <circle cx="290" cy="8" r="0.7" fill="white" opacity="0.5"/>
        <circle cx="355" cy="28" r="0.9" fill="white" opacity="0.7"/>
        <circle cx="75" cy="42" r="0.5" fill="white" opacity="0.4"/>
        <circle cx="165" cy="35" r="0.8" fill="white" opacity="0.6"/>
        <circle cx="325" cy="20" r="0.7" fill="white" opacity="0.5"/>
        <path d="M-10 165 L30 118 L65 138 L105 105 L145 125 L182 95 L218 118 L258 90 L295 112 L332 96 L368 114 L400 120 L400 165Z" fill="#160b28"/>
        <path d="M-10 185 L18 152 L48 168 L82 142 L118 160 L152 132 L188 150 L224 128 L260 146 L295 130 L330 148 L365 133 L400 145 L400 185Z" fill="#1a0820"/>
        <rect x="125" y="170" width="140" height="18" rx="1.5" fill="#0a0410"/>
        <rect x="120" y="185" width="150" height="5" rx="1" fill="#080308"/>
        <rect x="138" y="138" width="114" height="34" fill="#0c0510"/>
        <path d="M118 138 L195 118 L272 138Z" fill="#0a0410"/>
        <rect x="118" y="135" width="154" height="5" rx="1" fill="#080308"/>
        <rect x="120" y="138" width="6" height="34" fill="#080308"/>
        <rect x="264" y="138" width="6" height="34" fill="#080308"/>
        <rect x="132" y="142" width="126" height="3" rx="1" fill="#0d0512"/>
        <rect x="140" y="145" width="3" height="8" fill="#0a0410"/>
        <ellipse cx="141" cy="154" rx="4" ry="2.5" fill="#0a0410"/>
        <rect x="154" y="145" width="3" height="9" fill="#0a0410"/>
        <ellipse cx="155" cy="155" rx="4" ry="2.5" fill="#0a0410"/>
        <rect x="192" y="145" width="3" height="10" fill="#0a0410"/>
        <ellipse cx="193" cy="156" rx="4" ry="2.5" fill="#0a0410"/>
        <rect x="234" y="145" width="3" height="8" fill="#0a0410"/>
        <ellipse cx="235" cy="154" rx="4" ry="2.5" fill="#0a0410"/>
        <rect x="248" y="145" width="3" height="9" fill="#0a0410"/>
        <ellipse cx="249" cy="155" rx="4" ry="2.5" fill="#0a0410"/>
        <ellipse cx="195" cy="186" rx="80" ry="12" fill="#c4651a" opacity="0.1"/>
        <path d="M118 188 Q123 183 130 186 Q136 181 143 185 Q150 180 158 184 Q165 179 173 183 Q180 178 188 182 Q195 177 202 181 Q210 177 218 181 Q225 179 232 183 Q238 180 245 184 Q252 181 258 185 Q264 182 270 186 L270 192 L118 192Z" fill="#080308"/>
        <path d="M-10 188 Q100 184 195 188 Q290 192 400 186 L400 220 L-10 220Z" fill="#120610"/>
        <g opacity="0.5">
          <rect x="62" y="170" width="2.5" height="22" fill="#08030c"/>
          <path d="M63 170 Q56 161 51 158" stroke="#08030c" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
          <path d="M64 169 Q71 160 75 157" stroke="#08030c" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
        </g>
        <g opacity="0.4">
          <rect x="325" y="174" width="2" height="18" fill="#08030c"/>
          <path d="M326 174 Q319 166 315 163" stroke="#08030c" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
          <path d="M327 173 Q334 165 338 162" stroke="#08030c" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        </g>
      </svg>

      {/* Profile info overlay */}
      <div style={{position:'absolute',inset:0,padding:'20px 20px 0',display:'flex',flexDirection:'column',justifyContent:'flex-start'}}>
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:14}}>
            <div style={{width:58,height:58,borderRadius:16,background:'linear-gradient(135deg,#D4537E,#C4651A)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'DM Serif Display',serif",fontSize:22,color:'white',flexShrink:0}}>
              {profile?.display_name?.[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{fontFamily:"'DM Serif Display',serif",fontSize:18,color:'white'}}>{profile?.display_name}</div>
              <div style={{fontSize:11,color:'rgba(255,255,255,0.35)',marginTop:2}}>@{profile?.username}</div>
              <div style={{display:'flex',alignItems:'center',gap:5,marginTop:5}}>
                <div style={{width:5,height:5,borderRadius:'50%',background:'#D4537E'}}></div>
                <span style={{fontSize:10,color:'rgba(212,83,126,0.7)',fontWeight:500,textTransform:'uppercase',letterSpacing:'0.06em'}}>Coachella W1 2026</span>
              </div>
            </div>
          </div>
          <button onClick={onSignOut} style={{fontSize:11,color:'rgba(255,255,255,0.2)',paddingTop:2,background:'none',border:'none',cursor:'pointer',fontFamily:"'DM Sans',sans-serif"}}>sign out</button>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',borderTop:'0.5px solid rgba(255,255,255,0.07)',background:'#0c0c0e'}}>
        {[
          { label: 'Sets logged', value: shows.length.toString() },
          { label: 'Avg score', value: avgScore || '—' },
          { label: 'Weekend', value: 'W1' },
        ].map((stat, i) => (
          <div key={i} style={{padding:'14px 0',textAlign:'center',borderRight: i < 2 ? '0.5px solid rgba(255,255,255,0.07)' : 'none'}}>
            <div style={{fontFamily:"'DM Serif Display',serif",fontSize:18,color: i === 1 && avgScore ? '#E9537E' : 'white'}}>{stat.value}</div>
            <div style={{fontSize:9,textTransform:'uppercase',letterSpacing:'0.08em',color:'rgba(255,255,255,0.25)',marginTop:2}}>{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [shows, setShows] = useState<Show[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editReview, setEditReview] = useState('')
  const [editTags, setEditTags] = useState<string[]>([])
  const [editSaving, setEditSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      const [{ data: prof }, { data: showData }] = await Promise.all([
        supabase.from('profiles').select('username, display_name').eq('id', user.id).single(),
        supabase.from('logged_shows').select('*').eq('user_id', user.id).order('elo', { ascending: false }),
      ])
      setProfile(prof)
      setShows(showData || [])
      setLoading(false)
    }
    load()
  }, [router])

  async function copyLink() {
    if (!profile) return
    const url = `${window.location.origin}/u/${profile.username}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  function startEdit(show: Show) {
    setEditingId(show.id)
    setEditReview(show.review || '')
    setEditTags(show.tags || [])
  }

  async function saveEdit(showId: string) {
    setEditSaving(true)
    const review = editReview.trim() || null
    const tags = editTags.length > 0 ? editTags : null
    const { error } = await supabase
      .from('logged_shows')
      .update({ review, tags })
      .eq('id', showId)
    if (!error) {
      setShows(prev => prev.map(s => s.id === showId ? { ...s, review, tags } : s))
      setEditingId(null)
    }
    setEditSaving(false)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen pb-28">
      <DesertHeader profile={profile} shows={shows} onSignOut={signOut} />

      <div className="px-5 pt-4">
        <button onClick={copyLink}
          className="w-full mb-5 rounded-xl border flex items-center gap-3 px-4 py-3 transition-colors active:opacity-70"
          style={{background:'rgba(212,83,126,0.06)', borderColor:'rgba(212,83,126,0.2)'}}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{background:'rgba(212,83,126,0.15)'}}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M8 1h5v5M13 1L6 8M5.5 3H2a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V8.5" stroke="#D4537E" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="flex-1 text-left">
            <p className="text-white text-sm font-medium">{copied ? 'Link copied!' : 'Share my rankings'}</p>
            <p className="text-white/25 text-xs">gigl.app/u/{profile?.username}</p>
          </div>
        </button>

        <p className="text-[10px] uppercase tracking-[0.15em] text-white/25 mb-3">My rankings</p>

        {shows.length === 0 ? (
          <div className="text-center py-14">
            <p className="text-4xl mb-3">🎪</p>
            <p className="text-white/25 text-sm mb-5">No sets logged yet</p>
            <Link href="/log" className="inline-block text-white text-sm font-medium rounded-xl px-6 py-3" style={{background:'#D4537E'}}>
              Log your first set →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {shows.map((show, i) => {
              const score = eloToDisplay(show.elo)
              const rankLabel = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}`
              return (
                <div key={show.id} className="rounded-xl border border-white/[0.05] overflow-hidden fade-up"
                  style={{background:'#161618', animationDelay:`${i*40}ms`}}>
                  {resolvePhotoUrl(show.photo_url) && (
                    <div style={{height:180,overflow:'hidden'}}>
                      <img src={resolvePhotoUrl(show.photo_url)!} alt={show.artist_name} style={{width:'100%',height:'100%',objectFit:'cover'}} />
                    </div>
                  )}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <span className="text-sm w-5 text-center flex-shrink-0 font-medium"
                      style={{color: i > 2 ? 'rgba(255,255,255,0.2)' : undefined}}>
                      {rankLabel}
                    </span>
                    <span className="text-2xl flex-shrink-0">{show.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{show.artist_name}</p>
                      <p className="text-white/30 text-xs mt-0.5">{show.stage} · {show.day}</p>
                    </div>
                    <span className="font-serif text-xl flex-shrink-0" style={{color: scoreColor(score)}}>{score}</span>
                    <button
                      onClick={() => editingId === show.id ? setEditingId(null) : startEdit(show)}
                      style={{background:'none', border:'none', cursor:'pointer', padding:'2px 4px', flexShrink:0, opacity: editingId === show.id ? 1 : 0.4}}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={editingId === show.id ? '#D35400' : '#f5ebe3'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                  </div>

                  {editingId === show.id ? (
                    <div style={{padding: '0 16px 16px'}}>
                      <textarea
                        value={editReview}
                        onChange={e => setEditReview(e.target.value)}
                        maxLength={280}
                        placeholder="Add a review..."
                        rows={3}
                        style={{
                          width: '100%', background: '#0f0f11', border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 10, padding: '10px 12px', color: '#f5ebe3', fontSize: 13,
                          fontFamily: "'Manrope', sans-serif", resize: 'none', outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                      <div style={{display:'flex', flexWrap:'wrap', gap:6, margin:'10px 0'}}>
                        {TAGS.map(tag => {
                          const active = editTags.includes(tag)
                          return (
                            <button key={tag} onClick={() => setEditTags(prev =>
                              active ? prev.filter(t => t !== tag) : [...prev, tag]
                            )} style={{
                              fontSize: 10, padding: '4px 10px', borderRadius: 20, cursor: 'pointer',
                              background: active ? 'rgba(211,84,0,0.2)' : 'rgba(255,255,255,0.04)',
                              color: active ? '#D35400' : 'rgba(255,255,255,0.35)',
                              border: active ? '1px solid rgba(211,84,0,0.4)' : '1px solid rgba(255,255,255,0.08)',
                              fontFamily: "'Manrope', sans-serif",
                            }}>{tag}</button>
                          )
                        })}
                      </div>
                      <div style={{display:'flex', gap:8, marginTop:4}}>
                        <button onClick={() => setEditingId(null)} style={{
                          flex:1, padding:'9px 0', borderRadius:10, background:'rgba(255,255,255,0.05)',
                          border:'1px solid rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.4)',
                          fontSize:12, cursor:'pointer', fontFamily:"'Manrope', sans-serif",
                        }}>Cancel</button>
                        <button onClick={() => saveEdit(show.id)} disabled={editSaving} style={{
                          flex:2, padding:'9px 0', borderRadius:10, background:'#D35400',
                          border:'none', color:'#fff', fontSize:12, fontWeight:700,
                          cursor: editSaving ? 'default' : 'pointer', opacity: editSaving ? 0.7 : 1,
                          fontFamily:"'Manrope', sans-serif", letterSpacing:'0.06em', textTransform:'uppercase',
                        }}>{editSaving ? 'Saving...' : 'Save'}</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {show.review && (
                        <p style={{ padding: '4px 16px 8px', fontSize: 12, color: 'rgba(245,235,227,0.45)', fontStyle: 'italic', lineHeight: 1.5 }}>
                          "{show.review}"
                        </p>
                      )}
                      {show.tags && show.tags.length > 0 && (
                        <div style={{ padding: '0 16px 12px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {show.tags.map(tag => (
                            <span key={tag} style={{
                              fontSize: 10, padding: '3px 10px', borderRadius: 20,
                              background: 'rgba(211,84,0,0.12)', color: 'rgba(211,84,0,0.7)',
                              border: '1px solid rgba(211,84,0,0.2)',
                              fontFamily: "'Manrope', sans-serif", letterSpacing: '0.04em',
                            }}>{tag}</span>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  )
}

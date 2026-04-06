'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const DesertHero = () => (
  <div style={{position:'relative',overflow:'hidden',height:320}}>
    <svg width="100%" height="320" viewBox="0 0 390 320" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <rect width="390" height="320" fill="#08040f"/>
      <rect width="390" height="200" fill="#0e0620"/>
      <ellipse cx="195" cy="210" rx="300" ry="90" fill="#3a0e1c" opacity="0.95"/>
      <ellipse cx="195" cy="222" rx="240" ry="70" fill="#6a1828" opacity="0.8"/>
      <ellipse cx="195" cy="232" rx="180" ry="55" fill="#b83a18" opacity="0.55"/>
      <ellipse cx="195" cy="242" rx="130" ry="40" fill="#e06c20" opacity="0.4"/>
      <ellipse cx="195" cy="250" rx="90" ry="28" fill="#f0a030" opacity="0.25"/>
      <circle cx="40" cy="22" r="1.1" fill="white" opacity="0.9"/>
      <circle cx="115" cy="12" r="0.8" fill="white" opacity="0.7"/>
      <circle cx="195" cy="20" r="1.3" fill="white" opacity="1"/>
      <circle cx="275" cy="8" r="0.7" fill="white" opacity="0.6"/>
      <circle cx="348" cy="32" r="1" fill="white" opacity="0.8"/>
      <circle cx="65" cy="48" r="0.6" fill="white" opacity="0.5"/>
      <circle cx="155" cy="38" r="0.9" fill="white" opacity="0.7"/>
      <circle cx="318" cy="18" r="0.8" fill="white" opacity="0.8"/>
      <circle cx="375" cy="55" r="0.5" fill="white" opacity="0.5"/>
      <circle cx="88" cy="72" r="0.7" fill="white" opacity="0.4"/>
      <circle cx="245" cy="60" r="1" fill="white" opacity="0.7"/>
      <circle cx="28" cy="85" r="0.6" fill="white" opacity="0.3"/>
      <circle cx="330" cy="70" r="0.8" fill="white" opacity="0.5"/>
      <circle cx="180" cy="55" r="0.6" fill="white" opacity="0.4"/>
      <path d="M-10 230 L25 168 L60 190 L100 152 L140 175 L178 138 L215 162 L255 130 L295 155 L332 138 L368 158 L400 165 L400 230Z" fill="#160b28"/>
      <path d="M-10 248 L18 202 L50 220 L85 192 L122 212 L158 182 L195 200 L232 176 L268 196 L305 178 L340 196 L375 180 L400 192 L400 248Z" fill="#220e38"/>
      <path d="M-10 265 L12 232 L42 248 L75 220 L108 240 L142 215 L178 234 L212 210 L248 228 L284 212 L318 230 L352 216 L385 228 L400 222 L400 265Z" fill="#1a0820"/>
      <path d="M-10 262 Q100 258 195 262 Q290 266 400 260 L400 320 L-10 320Z" fill="#120610"/>
      <rect x="95" y="248" width="200" height="18" rx="2" fill="#0a0410"/>
      <rect x="90" y="263" width="210" height="6" rx="1" fill="#080308"/>
      <rect x="110" y="195" width="170" height="55" fill="#0c0510"/>
      <path d="M85 195 L195 172 L305 195Z" fill="#0a0410"/>
      <rect x="85" y="192" width="220" height="6" rx="1" fill="#080308"/>
      <rect x="88" y="195" width="8" height="55" fill="#080308"/>
      <rect x="294" y="195" width="8" height="55" fill="#080308"/>
      <rect x="191" y="195" width="8" height="55" fill="#090410"/>
      <rect x="100" y="200" width="190" height="4" rx="1" fill="#0d0512"/>
      <rect x="112" y="204" width="4" height="10" fill="#0a0410"/>
      <ellipse cx="114" cy="216" rx="5" ry="3" fill="#0a0410"/>
      <rect x="128" y="204" width="4" height="12" fill="#0a0410"/>
      <ellipse cx="130" cy="218" rx="5" ry="3" fill="#0a0410"/>
      <rect x="144" y="204" width="4" height="9" fill="#0a0410"/>
      <ellipse cx="146" cy="215" rx="5" ry="3" fill="#0a0410"/>
      <rect x="186" y="204" width="4" height="13" fill="#0a0410"/>
      <ellipse cx="188" cy="219" rx="5" ry="3" fill="#0a0410"/>
      <rect x="200" y="204" width="4" height="10" fill="#0a0410"/>
      <ellipse cx="202" cy="216" rx="5" ry="3" fill="#0a0410"/>
      <rect x="240" y="204" width="4" height="9" fill="#0a0410"/>
      <ellipse cx="242" cy="215" rx="5" ry="3" fill="#0a0410"/>
      <rect x="256" y="204" width="4" height="12" fill="#0a0410"/>
      <ellipse cx="258" cy="218" rx="5" ry="3" fill="#0a0410"/>
      <rect x="272" y="204" width="4" height="10" fill="#0a0410"/>
      <ellipse cx="274" cy="216" rx="5" ry="3" fill="#0a0410"/>
      <ellipse cx="195" cy="264" rx="110" ry="18" fill="#c4651a" opacity="0.12"/>
      <ellipse cx="195" cy="268" rx="75" ry="10" fill="#e8832a" opacity="0.08"/>
      <path d="M130 216 L80 265" stroke="#e06c20" strokeWidth="1.5" opacity="0.08"/>
      <path d="M188 219 L155 265" stroke="#f0a030" strokeWidth="1.5" opacity="0.1"/>
      <path d="M202 216 L225 265" stroke="#f0a030" strokeWidth="1.5" opacity="0.1"/>
      <path d="M258 218 L305 265" stroke="#e06c20" strokeWidth="1.5" opacity="0.08"/>
      <g opacity="0.55">
        <rect x="55" y="238" width="3" height="28" fill="#08030c"/>
        <path d="M56 238 Q48 228 42 224" stroke="#08030c" strokeWidth="2" fill="none" strokeLinecap="round"/>
        <path d="M57 237 Q65 226 70 222" stroke="#08030c" strokeWidth="2" fill="none" strokeLinecap="round"/>
        <path d="M56 236 Q50 223 54 218" stroke="#08030c" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      </g>
      <g opacity="0.45">
        <rect x="332" y="242" width="2.5" height="24" fill="#08030c"/>
        <path d="M333 242 Q325 232 320 228" stroke="#08030c" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
        <path d="M334 241 Q342 231 347 227" stroke="#08030c" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
      </g>
      <path d="M90 266 Q95 260 100 264 Q105 258 112 262 Q118 257 124 261 Q130 256 138 260 Q145 255 152 259 Q158 254 165 258 Q172 253 180 257 Q186 252 195 256 Q204 252 212 256 Q218 253 226 257 Q233 254 240 258 Q246 255 252 259 Q258 256 265 260 Q270 257 276 261 Q282 258 288 262 Q294 259 300 263 L300 270 L90 270Z" fill="#080308"/>
    </svg>
    <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',justifyContent:'space-between',padding:'24px'}}>
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <div style={{width:34,height:34,borderRadius:9,background:'#D4537E',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="5.5" r="3" stroke="white" strokeWidth="1.2" fill="none"/>
            <path d="M3 13 Q8 9 13 13" stroke="white" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
            <circle cx="8" cy="5.5" r="1.2" fill="white"/>
          </svg>
        </div>
        <span style={{fontFamily:"'DM Serif Display',serif",fontSize:17,color:'white'}}>gigl</span>
      </div>
      <div>
        <h1 style={{fontFamily:"'DM Serif Display',serif",fontSize:32,color:'white',lineHeight:1.1,marginBottom:6}}>
          Rate every<br /><em style={{color:'#E8832A'}}>Coachella set.</em>
        </h1>
        <p style={{fontSize:12,color:'rgba(255,255,255,0.4)'}}>Log · rank · share with your crew</p>
      </div>
    </div>
  </div>
)

export default function AuthPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'signin' | 'signup'>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { data: { username, display_name: username } }
      })
      if (error) { setError(error.message); setLoading(false); return }
      if (data.session) {
        await supabase.from('profiles').update({ username, display_name: username }).eq('id', data.session.user.id)
        router.replace('/feed')
        return
      }
      setConfirmed(true)
      setLoading(false)
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
      router.replace('/feed')
    }
  }

  if (confirmed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center mb-6">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <path d="M4 14l7 7L24 7" stroke="#D4537E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h2 className="font-serif text-2xl text-white mb-3">Check your email</h2>
        <p className="text-white/40 text-sm leading-relaxed mb-8 max-w-xs">
          We sent a confirmation link to <span className="text-white/70">{email}</span>. Click it, then come back and sign in.
        </p>
        <button onClick={() => { setMode('signin'); setConfirmed(false) }}
          className="w-full max-w-xs bg-brand text-white rounded-2xl py-4 text-sm font-medium">
          Sign in →
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <DesertHero />
      <div className="flex-1 px-6 pt-5 pb-10 flex flex-col">
        <div className="flex bg-card rounded-xl p-1 mb-5 border border-white/[0.06]">
          {(['signup','signin'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setError('') }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${mode === m ? 'bg-brand text-white' : 'text-white/35'}`}>
              {m === 'signup' ? 'Sign up' : 'Sign in'}
            </button>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 flex-1">
          {mode === 'signup' && (
            <div>
              <label className="text-xs uppercase tracking-widest text-white/30 mb-2 block">Username</label>
              <input type="text" value={username}
                onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,''))}
                placeholder="yourname" required
                className="w-full bg-card border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-white/20 text-sm outline-none focus:border-brand transition-colors" />
            </div>
          )}
          <div>
            <label className="text-xs uppercase tracking-widest text-white/30 mb-2 block">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@email.com" required
              className="w-full bg-card border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-white/20 text-sm outline-none focus:border-brand transition-colors" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-white/30 mb-2 block">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="6+ characters" required minLength={6}
              className="w-full bg-card border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-white/20 text-sm outline-none focus:border-brand transition-colors" />
          </div>
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
          <div className="flex-1 min-h-3" />
          <button type="submit" disabled={loading}
            className="w-full bg-brand text-white rounded-2xl py-4 text-sm font-medium disabled:opacity-40 active:opacity-80 transition-opacity">
            {loading ? 'Just a sec…' : mode === 'signup' ? 'Create account →' : 'Sign in →'}
          </button>
          {mode === 'signup' && <p className="text-white/20 text-xs text-center">No spam. No nonsense.</p>}
        </form>
      </div>
    </div>
  )
}

'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

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
        email,
        password,
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
      <div className="relative overflow-hidden px-6 pt-16 pb-10">
        <div className="absolute inset-0 bg-[#1a0a10]" />
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-[#0c0c0e]" style={{clipPath:'ellipse(120% 100% at 50% 100%)'}} />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="7" r="4" stroke="white" strokeWidth="1.4" fill="none"/>
                <path d="M5 16 Q10 11 15 16" stroke="white" strokeWidth="1.4" fill="none" strokeLinecap="round"/>
                <circle cx="10" cy="7" r="1.5" fill="white"/>
              </svg>
            </div>
            <span className="font-serif text-xl text-white tracking-wide">gigl</span>
          </div>
          <h1 className="font-serif text-4xl text-white leading-tight mb-3">
            Rate every<br /><em className="text-brand">Coachella set.</em>
          </h1>
          <p className="text-white/40 text-sm leading-relaxed">
            Log shows, rank them head-to-head, see what your crew thought.
          </p>
        </div>
      </div>

      <div className="flex-1 px-6 pt-6 pb-10 flex flex-col">
        <div className="flex bg-card rounded-xl p-1 mb-6 border border-white/[0.06]">
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
          <div className="flex-1 min-h-4" />
          <button type="submit" disabled={loading}
            className="w-full bg-brand text-white rounded-2xl py-4 text-sm font-medium disabled:opacity-40 active:opacity-80 transition-opacity">
            {loading ? 'Just a sec…' : mode === 'signup' ? 'Create account →' : 'Sign in →'}
          </button>
          {mode === 'signup' && (
            <p className="text-white/20 text-xs text-center">No spam. No nonsense.</p>
          )}
        </form>
      </div>
    </div>
  )
}

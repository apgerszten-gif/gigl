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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
      // Update username
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('profiles').update({ username, display_name: username }).eq('id', user.id)
      }
      router.replace('/feed')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
      router.replace('/feed')
    }
  }

  return (
    <div className="min-h-screen flex flex-col px-6 pt-16 pb-8">
      <div className="mb-10">
        <div className="w-12 h-12 rounded-2xl bg-brand flex items-center justify-center mb-6">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="9" r="5" stroke="white" strokeWidth="1.5" fill="none"/>
            <path d="M6 18 Q12 13 18 18" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
            <circle cx="12" cy="9" r="2" fill="white"/>
          </svg>
        </div>
        <h1 className="font-serif text-3xl text-white mb-2">
          {mode === 'signup' ? 'Create your account' : 'Welcome back'}
        </h1>
        <p className="text-white/40 text-sm">
          {mode === 'signup' ? 'Rate every Coachella set. See what your friends thought.' : 'Sign in to see your rankings.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 flex-1">
        {mode === 'signup' && (
          <div>
            <label className="text-xs uppercase tracking-widest text-white/30 mb-2 block">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s/g,''))}
              placeholder="yourname"
              required
              className="w-full bg-card border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/25 text-sm outline-none focus:border-brand transition-colors"
            />
          </div>
        )}
        <div>
          <label className="text-xs uppercase tracking-widest text-white/30 mb-2 block">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@email.com"
            required
            className="w-full bg-card border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/25 text-sm outline-none focus:border-brand transition-colors"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-widest text-white/30 mb-2 block">Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={6}
            className="w-full bg-card border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/25 text-sm outline-none focus:border-brand transition-colors"
          />
        </div>

        {error && (
          <p className="text-red-400 text-sm bg-red-400/10 rounded-xl px-4 py-3">{error}</p>
        )}

        <div className="flex-1" />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand text-white rounded-2xl py-4 text-sm font-medium disabled:opacity-40 transition-opacity active:opacity-80"
        >
          {loading ? 'Just a sec…' : mode === 'signup' ? 'Create account →' : 'Sign in →'}
        </button>

        <button
          type="button"
          onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError('') }}
          className="text-white/30 text-sm py-2"
        >
          {mode === 'signup' ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
        </button>
      </form>
    </div>
  )
}

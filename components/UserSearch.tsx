'use client'

import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { PersonRow, type Person } from '@/components/PeopleList'
import { createClient } from '@/lib/supabase/client'
import { inputBox } from '@/components/ui'

const SEARCH_DEBOUNCE_MS = 300
const MIN_QUERY = 2
const MAX_RESULTS = 8

// .or() takes a comma-separated filter string, so strip anything it would
// read as syntax, and the LIKE wildcards. See escapeForOrFilter in
// lib/shows/repository.ts. Underscores stay, since handles use them; as a
// one-character wildcard, the worst one does is match slightly too much.
function cleanQuery(input: string): string {
  return input.replace(/[,()\\%*"]/g, ' ').trim()
}

// Find someone by name or handle. Each result links to their public profile,
// where their ratings are, and can be followed from right here. Accounts that
// haven't chosen a username yet are left out, since they're not anyone a
// friend could recognise.
export function UserSearch() {
  const supabase = createClient()
  const { user } = useAuth()

  const [query, setQuery]     = useState('')
  const [results, setResults] = useState<Person[]>([])
  const [settled, setSettled] = useState(false)
  const [failed, setFailed]   = useState(false)

  const cleaned = cleanQuery(query)
  const searching = cleaned.length >= MIN_QUERY

  useEffect(() => {
    setSettled(false)
    setFailed(false)
    if (cleaned.length < MIN_QUERY) { setResults([]); return }

    let cancelled = false
    const timeoutId = setTimeout(async () => {
      let request = supabase.from('profiles')
        .select('id, username, display_name, avatar_url')
        .or(`username.ilike.%${cleaned}%,display_name.ilike.%${cleaned}%`)
        .eq('username_set', true)
        .order('username')
        .limit(MAX_RESULTS)
      if (user) request = request.neq('id', user.id)

      const { data, error } = await request
      if (cancelled) return
      if (error) console.error('user search failed:', error.message)
      setFailed(!!error)
      setResults(data ?? [])
      setSettled(true)
    }, SEARCH_DEBOUNCE_MS)

    return () => { cancelled = true; clearTimeout(timeoutId) }
  }, [cleaned, user?.id])

  return (
    <div className="space-y-2">
      <label className={`${inputBox} flex items-center gap-2 px-3 py-2`}>
        <Search className="w-4 h-4 text-ink-muted flex-shrink-0" strokeWidth={1.75} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search for other users"
          aria-label="Search for other users"
          className="flex-1 min-w-0 bg-transparent text-base text-ink placeholder:text-ink-faint focus:outline-none"
        />
      </label>

      {searching && results.length > 0 && (
        <div className="flex flex-col gap-2">
          {results.map(person => <PersonRow key={person.id} person={person} />)}
        </div>
      )}

      {searching && settled && results.length === 0 && (
        <p className="text-[11px] leading-snug text-ink-faint">
          {failed ? 'Couldn’t search right now. Try again in a moment.' : `No one on Gigl matches “${cleaned}” yet.`}
        </p>
      )}
    </div>
  )
}

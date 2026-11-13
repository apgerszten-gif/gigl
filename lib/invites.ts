import { createClient } from './supabase/client'
import type { SavableShow } from './savedShows'

// "Alex is going, you in?" links for a show someone has saved (see
// show_invites in supabase-schema.sql). An invite copies the one show it's
// for, so the saved_shows table itself stays private.

export interface ShowInvite {
  token:          string
  owner_id:       string | null
  owner_name:     string | null
  owner_username: string | null
  owner_avatar:   string | null
  show_id:        string
  artist:         string
  venue:          string
  city:           string
  state:          string
  show_date:      string
  image_url:      string | null
}

const TOKEN_ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'

// 10 characters from 56 is about 58 bits: short enough to read in a text,
// far too many to guess.
function newToken(): string {
  const bytes = new Uint8Array(10)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, b => TOKEN_ALPHABET[b % TOKEN_ALPHABET.length]).join('')
}

export function invitePath(token: string): string {
  return `/i/${token}`
}

// The live invite for this show, if there is one, so sharing twice sends the
// same link and everyone's "I'm in" lands in one place.
export async function findInvite(userId: string, showId: string): Promise<{ token: string; anonymous: boolean } | null> {
  const { data, error } = await createClient()
    .from('show_invites')
    .select('token, anonymous')
    .eq('owner_id', userId).eq('show_id', showId).is('revoked_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
  if (error) throw new Error(error.message)
  return data?.[0] ?? null
}

export async function createInvite(userId: string, show: SavableShow, anonymous: boolean): Promise<string> {
  if (!show.isoDate) throw new Error('A show with no date cannot be shared as an invite.')
  const token = newToken()
  const { error } = await createClient().from('show_invites').insert({
    token,
    owner_id:  userId,
    show_id:   show.id,
    artist:    show.artist,
    venue:     show.venue,
    city:      show.city,
    state:     show.state,
    show_date: show.isoDate,
    image_url: show.imageUrl ?? null,
    anonymous,
  })
  if (error) throw new Error(error.message)
  return token
}

export async function setInviteAnonymous(token: string, anonymous: boolean): Promise<void> {
  const { error } = await createClient().from('show_invites').update({ anonymous }).eq('token', token)
  if (error) throw new Error(error.message)
}

export async function revokeInvite(token: string): Promise<void> {
  const { error } = await createClient().from('show_invites').update({ revoked_at: new Date().toISOString() }).eq('token', token)
  if (error) throw new Error(error.message)
}

export async function getInvite(token: string): Promise<ShowInvite | null> {
  const { data, error } = await createClient().rpc('get_show_invite', { invite_token: token })
  if (error) throw new Error(error.message)
  return ((data ?? []) as ShowInvite[])[0] ?? null
}

export async function hasRsvped(token: string, userId: string): Promise<boolean> {
  const { data } = await createClient().from('invite_rsvps').select('token').eq('token', token).eq('user_id', userId).limit(1)
  return (data ?? []).length > 0
}

// Records "I'm in" for whoever is signed in, through join_show_invite(): the
// invite_rsvps insert policy can't see the inviter's invite row, so a plain
// insert is always refused.
export async function rsvp(token: string): Promise<void> {
  const { data, error } = await createClient().rpc('join_show_invite', { invite_token: token })
  if (error) throw new Error(error.message)
  if (data === false) throw new Error('This invite has ended.')
}

// For the owner's Saved shows: show id -> first names of everyone who said
// they're in through any of the owner's invites to it.
export async function loadInviteRsvps(userId: string): Promise<Record<string, string[]>> {
  const supabase = createClient()
  const { data: invites, error } = await supabase.from('show_invites').select('token, show_id').eq('owner_id', userId)
  if (error || !invites || invites.length === 0) return {}
  const showOf = new Map(invites.map(i => [i.token as string, i.show_id as string]))

  const { data: rsvps } = await supabase.from('invite_rsvps').select('token, user_id').in('token', Array.from(showOf.keys()))
  if (!rsvps || rsvps.length === 0) return {}

  const ids = Array.from(new Set(rsvps.map(r => r.user_id as string)))
  const { data: people } = await supabase.from('profiles').select('id, username, display_name').in('id', ids)
  const nameOf = new Map((people ?? []).map(p => [p.id as string, firstName(p.display_name, p.username)]))

  const result: Record<string, string[]> = {}
  for (const r of rsvps) {
    const showId = showOf.get(r.token as string)
    const name = nameOf.get(r.user_id as string)
    if (!showId || !name) continue
    const names = (result[showId] ??= [])
    if (!names.includes(name)) names.push(name)
  }
  return result
}

export function firstName(displayName: string | null | undefined, username: string): string {
  return (displayName?.trim() || username).split(/\s+/)[0]
}

'use client'

import { normalizePhoneNumber } from './phone'

// Finding people you already know, from the device's contacts.
//
// Two things shape every decision here.
//
// **Gigl is a PWA, not a native app.** The only way a web page can read
// contacts is the Contact Picker API, which is Chrome on Android and nowhere
// else - no iOS Safari, no desktop, no Firefox. There is no permission to
// request and no polyfill to reach for. Everywhere else this feature simply
// does not exist, and the UI has to say so rather than appear broken.
//
// **The contacts are other people's data.** Someone in your address book
// never agreed to be uploaded to a gig-logging app. So no number ever leaves
// the device: they are normalised and hashed here, and only the hashes are
// sent. The server can confirm a hash matches one of its own users, and
// learns nothing at all about the ones that don't.

// The Contact Picker isn't in lib.dom.d.ts.
interface ContactsManager {
  select(properties: string[], options?: { multiple?: boolean }): Promise<{ tel?: string[] }[]>
  getProperties(): Promise<string[]>
}

function manager(): ContactsManager | null {
  if (typeof navigator === 'undefined') return null
  const nav = navigator as Navigator & { contacts?: ContactsManager }
  return nav.contacts && 'ContactsManager' in window ? nav.contacts : null
}

export function contactsSupported(): boolean {
  return manager() !== null
}

// SHA-256 over the E.164 number. Plain, unsalted and deterministic on
// purpose: the server has to be able to compute the same value for its own
// users, so a per-device salt would make matching impossible.
//
// That does mean a hash is only as private as the space of phone numbers,
// which is small enough to brute-force. It isn't a secret-keeping measure -
// it's so that the numbers of people who *aren't* on Gigl never arrive in a
// request body or a log line. The matched ones the server already knew.
async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function hashPhone(raw: string): Promise<string | null> {
  const e164 = normalizePhoneNumber(raw)
  return e164 ? sha256Hex(e164) : null
}

export interface PickedContacts {
  // Deduplicated hashes, ready to send.
  hashes: string[]
  // How many contacts were picked, for "we checked N contacts" copy. Never
  // sent anywhere - it exists so the UI can be honest about what happened.
  picked: number
}

// Opens the platform picker. The person chooses which contacts to share, so
// there's no all-or-nothing permission prompt and no way for the app to take
// more than was offered. Returns null if they dismiss it.
export async function pickContacts(): Promise<PickedContacts | null> {
  const contacts = manager()
  if (!contacts) return null

  let selected: { tel?: string[] }[]
  try {
    selected = await contacts.select(['tel'], { multiple: true })
  } catch {
    // Dismissed, or called outside a user gesture.
    return null
  }
  if (selected.length === 0) return null

  const hashes = new Set<string>()
  for (const contact of selected) {
    for (const tel of contact.tel ?? []) {
      const hash = await hashPhone(tel)
      if (hash) hashes.add(hash)
    }
  }

  return { hashes: Array.from(hashes), picked: selected.length }
}

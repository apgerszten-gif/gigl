// Basic normalization for user-entered phone numbers into E.164 format, so
// they match what Twilio sends in the webhook's `From` field exactly.
// Assumes a US number if no country code is given, since both festivals
// currently supported are US-based.
export function normalizePhoneNumber(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  if (trimmed.startsWith('+')) {
    const digits = '+' + trimmed.slice(1).replace(/\D/g, '')
    return /^\+\d{10,15}$/.test(digits) ? digits : null
  }

  const digitsOnly = trimmed.replace(/\D/g, '')
  if (digitsOnly.length === 10) return `+1${digitsOnly}`
  if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) return `+${digitsOnly}`
  return null
}

// Sign-up only takes US and Canadian numbers for now: a real area code and
// exchange (neither starts with 0 or 1), which also keeps texts from being
// sent to numbers that could never receive them.
export function isNorthAmericanNumber(e164: string): boolean {
  return /^\+1[2-9]\d{2}[2-9]\d{6}$/.test(e164)
}

// '+15551234567' -> '(555) 123-4567'; other numbers are shown as stored.
export function formatPhoneForDisplay(e164: string): string {
  const match = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(e164)
  return match ? `(${match[1]}) ${match[2]}-${match[3]}` : e164
}

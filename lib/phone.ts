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

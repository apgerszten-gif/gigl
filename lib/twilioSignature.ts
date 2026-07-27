import crypto from 'crypto'

// Twilio signs every webhook request with an X-Twilio-Signature header:
// HMAC-SHA1 over the full request URL with every POST param appended (key
// then value, params sorted alphabetically), keyed with the auth token.
// Validating this prevents anyone from POSTing a fake "From" number to
// /api/sms/webhook and logging ratings as someone else's linked phone.
export function isValidTwilioRequest(
  url: string,
  params: Record<string, string>,
  signature: string | null,
  authToken: string
): boolean {
  if (!signature) return false

  const sortedKeys = Object.keys(params).sort()
  let data = url
  for (const key of sortedKeys) {
    data += key + params[key]
  }

  const expected = crypto.createHmac('sha1', authToken).update(Buffer.from(data, 'utf-8')).digest('base64')

  const expectedBuf = Buffer.from(expected)
  const actualBuf = Buffer.from(signature)
  if (expectedBuf.length !== actualBuf.length) return false
  return crypto.timingSafeEqual(expectedBuf, actualBuf)
}

// Hand-rolled REST calls instead of the `twilio` npm package — sending a
// message is a single POST with HTTP Basic Auth, not worth a new
// dependency for. (Inbound webhook signature verification lives in
// app/api/sms/webhook/route.ts, also via plain Node `crypto`.)

const TWILIO_ACCOUNT_SID  = process.env.TWILIO_ACCOUNT_SID!
const TWILIO_AUTH_TOKEN   = process.env.TWILIO_AUTH_TOKEN!
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER!

export async function sendSms(to: string, body: string): Promise<void> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`
  const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')

  const params = new URLSearchParams({ To: to, From: TWILIO_PHONE_NUMBER, Body: body })

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Twilio send failed (${res.status}): ${text}`)
  }
}

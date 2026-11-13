// Prelude Notify: templated texts (https://docs.prelude.so/notify/v2/api-reference/send-a-message).
// Prelude already sends sign-up codes through Supabase's SMS hook; this is the
// app's own use of it, for review reminders. A template is set up and
// registered with carriers on Prelude's side, so a send is just its id, a
// number and the template's variables (exactly those, no more, no fewer).

const NOTIFY_URL = 'https://api.prelude.dev/v2/notify'

export type NotifyResult =
  | { ok: true; id: string }
  | { ok: false; code: string; message: string }

export function preludeConfigured(): boolean {
  return !!process.env.PRELUDE_API_KEY && !!process.env.PRELUDE_REVIEW_TEMPLATE_ID
}

export async function sendNotify(to: string, templateId: string, variables: Record<string, string>, correlationId?: string): Promise<NotifyResult> {
  const res = await fetch(NOTIFY_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PRELUDE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ to, template_id: templateId, variables, ...(correlationId ? { correlation_id: correlationId.slice(0, 80) } : {}) }),
    cache: 'no-store',
  })
  const body = await res.json().catch(() => null)
  if (res.ok && body?.id) return { ok: true, id: body.id }
  return { ok: false, code: body?.code ?? `http_${res.status}`, message: body?.message ?? res.statusText }
}

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CHANNEL_SECRET       = Deno.env.get('LINE_CHANNEL_SECRET') ?? ''
const CHANNEL_ACCESS_TOKEN = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN') ?? ''

async function verifySignature(body: string, signature: string): Promise<boolean> {
  if (!CHANNEL_SECRET) return true // skip verification if secret not set
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(CHANNEL_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
  const computed = btoa(String.fromCharCode(...new Uint8Array(sig)))
  return computed === signature
}

async function getLineProfile(userId: string): Promise<string> {
  if (!CHANNEL_ACCESS_TOKEN) return userId
  try {
    const res = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
      headers: { Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}` },
    })
    if (res.ok) {
      const data = await res.json()
      return data.displayName ?? userId
    }
  } catch (_) { /* ignore */ }
  return userId
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const body      = await req.text()
  const signature = req.headers.get('x-line-signature') ?? ''

  if (!(await verifySignature(body, signature))) {
    return new Response('Unauthorized', { status: 401 })
  }

  let payload: { events?: { source?: { userId?: string } }[] }
  try {
    payload = JSON.parse(body)
  } catch (_) {
    return new Response('Bad Request', { status: 400 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  const events = payload.events ?? []
  const seen = new Set<string>()

  for (const event of events) {
    const userId = event.source?.userId
    if (!userId || seen.has(userId)) continue
    seen.add(userId)

    const name = await getLineProfile(userId)

    const { error } = await supabase
      .from('users')
      .upsert({ line_id: userId, name }, { onConflict: 'line_id' })

    if (error) console.error('upsert error:', error.message)
    else console.log(`saved user: ${name} (${userId})`)
  }

  return new Response('OK', { status: 200 })
})

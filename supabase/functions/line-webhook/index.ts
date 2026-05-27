import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CHANNEL_SECRET       = Deno.env.get('LINE_CHANNEL_SECRET') ?? ''
const CHANNEL_ACCESS_TOKEN = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN') ?? ''

async function verifySignature(body: string, signature: string): Promise<boolean> {
  if (!CHANNEL_SECRET) return true
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
  if (!CHANNEL_ACCESS_TOKEN) {
    console.log(`[profile] no access token, using userId as name: ${userId}`)
    return userId
  }
  try {
    const res = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
      headers: { Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}` },
    })
    console.log(`[profile] LINE API status for ${userId}: ${res.status}`)
    if (res.ok) {
      const data = await res.json()
      console.log(`[profile] displayName: ${data.displayName}`)
      return data.displayName ?? userId
    }
  } catch (e) {
    console.error(`[profile] fetch error:`, e)
  }
  return userId
}

serve(async (req) => {
  console.log(`[webhook] received ${req.method} request`)

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const body      = await req.text()
  const signature = req.headers.get('x-line-signature') ?? ''
  console.log(`[webhook] body length: ${body.length}, signature: ${signature.slice(0, 10)}...`)

  if (!(await verifySignature(body, signature))) {
    console.error('[webhook] signature verification failed')
    return new Response('Unauthorized', { status: 401 })
  }

  let payload: { events?: { type?: string; source?: { type?: string; userId?: string } }[] }
  try {
    payload = JSON.parse(body)
    console.log(`[webhook] parsed payload, events count: ${payload.events?.length ?? 0}`)
  } catch (e) {
    console.error('[webhook] JSON parse error:', e)
    return new Response('Bad Request', { status: 400 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  const events = payload.events ?? []
  const seen   = new Set<string>()

  for (const event of events) {
    console.log(`[event] type: ${event.type}, source type: ${event.source?.type}, userId: ${event.source?.userId}`)

    const userId = event.source?.userId
    if (!userId || seen.has(userId)) continue
    seen.add(userId)

    const name = await getLineProfile(userId)
    console.log(`[upsert] attempting upsert for userId=${userId}, name=${name}`)

    const { data, error } = await supabase
      .from('users')
      .upsert({ line_id: userId, name }, { onConflict: 'line_id' })
      .select('id, line_id, name')

    if (error) {
      console.error(`[upsert] ERROR:`, JSON.stringify(error))
    } else {
      console.log(`[upsert] SUCCESS:`, JSON.stringify(data))
    }
  }

  return new Response('OK', { status: 200 })
})

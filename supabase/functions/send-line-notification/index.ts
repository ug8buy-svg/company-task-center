import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CHANNEL_ACCESS_TOKEN = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN') ?? ''

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  let body: { line_id?: string; message?: string }
  try {
    body = await req.json()
  } catch {
    return new Response('Bad Request', { status: 400 })
  }

  const { line_id, message } = body
  if (!line_id || !message) {
    return new Response('Missing line_id or message', { status: 400 })
  }

  console.log(`[send] sending to ${line_id}: ${message.slice(0, 30)}...`)

  const res = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      to: line_id,
      messages: [{ type: 'text', text: message }],
    }),
  })

  const data = await res.json()

  if (res.ok) {
    console.log(`[send] success for ${line_id}`)
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } else {
    console.error(`[send] LINE API error for ${line_id}:`, JSON.stringify(data))
    return new Response(JSON.stringify({ ok: false, error: data }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})

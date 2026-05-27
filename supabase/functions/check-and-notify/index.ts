import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL      = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const SEND_NOTIFY_URL   = `${SUPABASE_URL}/functions/v1/send-line-notification`

async function sendLine(lineId: string, message: string) {
  try {
    const res = await fetch(SEND_NOTIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ line_id: lineId, message }),
    })
    const data = await res.json()
    console.log(`[notify] sent to ${lineId}: ${res.ok ? 'OK' : 'FAIL'}`, JSON.stringify(data))
  } catch (e) {
    console.error(`[notify] fetch error for ${lineId}:`, e)
  }
}

serve(async () => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  const now      = new Date()
  const utcHour  = now.getUTCHours()
  const isMorning = utcHour < 12  // morning cron at UTC 01:00, evening at UTC 12:00

  console.log(`[check] UTC hour=${utcHour}, isMorning=${isMorning}`)

  // ── 查詢即將到來的展覽 ──
  const today = now.toISOString().split('T')[0]
  const { data: exhibitions, error: exErr } = await supabase
    .from('exhibitions')
    .select('id, name, event_date, notify_days_before')
    .gte('event_date', today)
    .order('event_date', { ascending: true })

  if (exErr) {
    console.error('[check] exhibitions query error:', exErr)
    return new Response('Error', { status: 500 })
  }

  // 只保留在 notify_days_before 視窗內的展覽
  const relevant = (exhibitions ?? []).filter(ex => {
    const daysLeft = Math.ceil(
      (new Date(ex.event_date).getTime() - new Date(today).getTime()) / 86_400_000,
    )
    return daysLeft <= ex.notify_days_before
  })

  console.log(`[check] ${exhibitions?.length ?? 0} upcoming, ${relevant.length} in notify window`)

  // ── 查詢使用者 ──
  const { data: users } = await supabase.from('users').select('line_id, role, name')
  const admin = users?.find(u => u.role === 'admin')
  const boss  = users?.find(u => u.role === 'boss')
  const staff = users?.find(u => u.role === 'staff')

  console.log(`[check] admin=${admin?.line_id}, boss=${boss?.line_id}, staff=${staff?.line_id}`)

  // ── 查詢未完成待辦 ──
  const { data: bossUndone  } = await supabase.from('boss_todos').select('content').eq('is_done', false)
  const { data: staffUndone } = await supabase.from('staff_todos').select('content').eq('is_done', false)

  console.log(`[check] bossUndone=${bossUndone?.length ?? 0}, staffUndone=${staffUndone?.length ?? 0}`)

  // ── 通知一：展前待辦提醒 ──
  for (const ex of relevant) {
    const daysLeft = Math.ceil(
      (new Date(ex.event_date).getTime() - new Date(today).getTime()) / 86_400_000,
    )

    if (boss?.line_id && bossUndone && bossUndone.length > 0) {
      const list = bossUndone.map(t => `• ${t.content}`).join('\n')
      await sendLine(
        boss.line_id,
        `📋 展覽提醒｜${ex.name}\n\n距離展覽還有 ${daysLeft} 天，以下待辦事項尚未完成：\n\n${list}\n\n請進入任務中心確認完成。`,
      )
    }

    if (staff?.line_id && staffUndone && staffUndone.length > 0) {
      const list = staffUndone.map(t => `• ${t.content}`).join('\n')
      await sendLine(
        staff.line_id,
        `📋 展覽提醒｜${ex.name}\n\n距離展覽還有 ${daysLeft} 天，以下待辦事項尚未完成：\n\n${list}\n\n請進入任務中心確認完成。`,
      )
    }
  }

  // ── 管理者通知一：倒數開始第一天（早上一次）──
  // 只在 daysLeft === notify_days_before 那天的早上通知一次
  if (isMorning && admin?.line_id) {
    const bossCount  = bossUndone?.length  ?? 0
    const staffCount = staffUndone?.length ?? 0
    for (const ex of relevant) {
      const daysLeft = Math.ceil(
        (new Date(ex.event_date).getTime() - new Date(today).getTime()) / 86_400_000,
      )
      if (daysLeft === ex.notify_days_before && (bossCount > 0 || staffCount > 0)) {
        await sendLine(
          admin.line_id,
          `📋 展覽提醒｜${ex.name}\n\n距離展覽還有 ${daysLeft} 天，倒數開始！\n\n劉淑華和仕庭有待辦事項尚未完成，請注意。`,
        )
      }
    }
  }

  // ── 通知二：待辦全部完成（12 小時內完成才通知，避免重複） ──
  const twelveHoursAgo = new Date(now.getTime() - 12 * 3_600_000).toISOString()
  const nearestEx      = relevant[0] ?? null

  if (admin?.line_id) {
    const { data: bossAll  } = await supabase.from('boss_todos').select('is_done, done_at')
    const { data: staffAll } = await supabase.from('staff_todos').select('is_done, done_at')

    if (bossAll && bossAll.length > 0 && bossAll.every(t => t.is_done)) {
      const lastDoneAt = bossAll.map(t => t.done_at).filter(Boolean).sort().pop()
      if (lastDoneAt && lastDoneAt >= twelveHoursAgo) {
        const time = new Date(lastDoneAt).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })
        const msg  = nearestEx
          ? `✅ 劉淑華 已完成所有待辦事項！\n展覽：${nearestEx.name}\n完成時間：${time}`
          : `✅ 劉淑華 已完成所有待辦事項！\n完成時間：${time}`
        await sendLine(admin.line_id, msg)
      }
    }

    if (staffAll && staffAll.length > 0 && staffAll.every(t => t.is_done)) {
      const lastDoneAt = staffAll.map(t => t.done_at).filter(Boolean).sort().pop()
      if (lastDoneAt && lastDoneAt >= twelveHoursAgo) {
        const time = new Date(lastDoneAt).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })
        const msg  = nearestEx
          ? `✅ 仕庭 已完成所有待辦事項！\n展覽：${nearestEx.name}\n完成時間：${time}`
          : `✅ 仕庭 已完成所有待辦事項！\n完成時間：${time}`
        await sendLine(admin.line_id, msg)
      }
    }
  }

  return new Response('OK', { status: 200 })
})

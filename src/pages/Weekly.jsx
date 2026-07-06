import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// ── 週期計算 ──
function getCurrentWeekStart() {
  const today = new Date()
  const day = today.getDay() // 0=Sun, 1=Mon, ..., 6=Sat
  let diff
  if (day === 0) diff = 1       // 週日 → 下週一
  else if (day === 6) diff = 2  // 週六 → 下週一
  else diff = -(day - 1)        // 週一~週五 → 本週一
  const monday = new Date(today)
  monday.setDate(today.getDate() + diff)
  return monday.toISOString().slice(0, 10)
}

function getWeekEnd(weekStart) {
  const friday = new Date(weekStart)
  friday.setDate(friday.getDate() + 4)
  return friday.toISOString().slice(0, 10)
}

function fmtDate(dateStr) {
  if (!dateStr) return ''
  const [, m, d] = dateStr.split('-')
  return `${parseInt(m)}/${parseInt(d)}`
}

function groupByAssignee(tasks) {
  const groups = {}
  const order = []
  tasks.forEach(t => {
    if (!groups[t.assignee]) {
      groups[t.assignee] = []
      order.push(t.assignee)
    }
    groups[t.assignee].push(t)
  })
  return order.map(a => ({ assignee: a, tasks: groups[a] }))
}

// ── 歷史週 ──
function HistoryWeek({ plan, tasks }) {
  const [open, setOpen] = useState(false)
  const done = tasks.filter(t => t.is_done).length
  const groups = groupByAssignee(tasks)

  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 14, overflow: 'hidden', marginBottom: 10,
    }}>
      <div
        onClick={() => setOpen(v => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', cursor: 'pointer', userSelect: 'none' }}
      >
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
            {fmtDate(plan.week_start)} - {fmtDate(plan.week_end)}
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 10 }}>
            {done}/{tasks.length} 完成
          </span>
        </div>
        <span style={{
          fontSize: 11, color: 'var(--text-secondary)',
          display: 'inline-block', transition: 'transform 0.2s',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
        }}>▼</span>
      </div>

      <div style={{ display: 'grid', gridTemplateRows: open ? '1fr' : '0fr', transition: 'grid-template-rows 0.2s ease' }}>
        <div style={{ overflow: 'hidden' }}>
          <div style={{ borderTop: '1px solid var(--border)', padding: '12px 16px 16px' }}>
            {tasks.length === 0 ? (
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center' }}>這週沒有任何任務</p>
            ) : groups.map(({ assignee, tasks: aTasks }) => (
              <div key={assignee} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>{assignee}</div>
                {aTasks.map(t => (
                  <div key={t.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 4px', borderBottom: '1px solid var(--border)',
                  }}>
                    <span style={{ fontSize: 14, color: t.is_done ? 'var(--blue)' : 'var(--text-secondary)', flexShrink: 0 }}>
                      {t.is_done ? '☑' : '☐'}
                    </span>
                    <span style={{
                      flex: 1, fontSize: 14,
                      color: t.is_done ? 'var(--text-secondary)' : 'var(--text-primary)',
                      textDecoration: t.is_done ? 'line-through' : 'none',
                    }}>{t.content}</span>
                    {t.is_pending_confirm && (
                      <span style={{
                        fontSize: 11, fontWeight: 600, color: 'var(--orange)',
                        background: 'rgba(234,88,12,0.12)', borderRadius: 10,
                        padding: '2px 7px', flexShrink: 0,
                      }}>待確認</span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── 本週 ──
function CurrentWeek({ plan, tasks, onToggleDone, onTogglePending, onDelete, onAdd }) {
  const [assignee, setAssignee] = useState(() => localStorage.getItem('weekly_last_assignee') || '')
  const [content, setContent]   = useState('')
  const [isPending, setIsPending] = useState(false)
  const [adding, setAdding]     = useState(false)

  const pendingTasks = tasks.filter(t => t.is_pending_confirm)
  const groups = groupByAssignee(tasks)

  const inp = {
    padding: '7px 10px', fontSize: 14,
    border: '1px solid var(--border)', borderRadius: 8,
    background: 'var(--bg)', color: 'var(--text-primary)',
    outline: 'none', fontFamily: 'inherit',
  }

  async function handleAdd() {
    if (!assignee.trim() || !content.trim()) return
    setAdding(true)
    const ok = await onAdd(plan.id, assignee.trim(), content.trim(), isPending)
    if (ok) {
      localStorage.setItem('weekly_last_assignee', assignee.trim())
      setContent('')
      setIsPending(false)
    }
    setAdding(false)
  }

  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 14, marginBottom: 16, overflow: 'hidden',
    }}>
      {/* 標題 */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
          本週　{fmtDate(plan.week_start)} - {fmtDate(plan.week_end)}
        </span>
      </div>

      {/* 待確認摘要 */}
      {pendingTasks.length > 0 && (
        <div style={{
          margin: '12px 16px 0',
          padding: '10px 14px',
          background: 'rgba(234,88,12,0.10)',
          border: '1px solid rgba(234,88,12,0.25)',
          borderRadius: 10,
          fontSize: 13, color: 'var(--orange)', fontWeight: 600,
        }}>
          🔔 本週有 {pendingTasks.length} 項待確認事項
        </div>
      )}

      {/* 任務清單 */}
      <div style={{ padding: '12px 16px' }}>
        {tasks.length === 0 ? (
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', padding: '8px 0 12px' }}>
            本週還沒有任何任務
          </p>
        ) : groups.map(({ assignee: a, tasks: aTasks }) => (
          <div key={a} style={{ marginBottom: 16 }}>
            <div style={{
              fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)',
              marginBottom: 6, paddingBottom: 4, borderBottom: '1px solid var(--border)',
            }}>{a}</div>
            {aTasks.map(t => (
              <div key={t.id} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 6px', marginBottom: 2, borderRadius: 8,
                background: t.is_pending_confirm ? 'rgba(234,88,12,0.07)' : 'transparent',
              }}>
                {/* 勾選框 */}
                <button
                  onClick={() => onToggleDone(t)}
                  style={{
                    flexShrink: 0, width: 20, height: 20,
                    border: `2px solid ${t.is_done ? 'var(--blue)' : 'var(--border)'}`,
                    borderRadius: 4, cursor: 'pointer', padding: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: t.is_done ? 'var(--blue)' : 'transparent',
                  }}
                >
                  {t.is_done && <span style={{ color: '#fff', fontSize: 12, lineHeight: 1 }}>✓</span>}
                </button>

                {/* 任務內容 */}
                <span style={{
                  flex: 1, fontSize: 14,
                  color: t.is_done ? 'var(--text-secondary)' : 'var(--text-primary)',
                  textDecoration: t.is_done ? 'line-through' : 'none',
                }}>{t.content}</span>

                {/* 待確認標籤 */}
                {t.is_pending_confirm && (
                  <span style={{
                    fontSize: 11, fontWeight: 600, color: 'var(--orange)',
                    background: 'rgba(234,88,12,0.12)', borderRadius: 10,
                    padding: '2px 7px', flexShrink: 0,
                  }}>待確認</span>
                )}

                {/* 待確認切換 */}
                <button
                  onClick={() => onTogglePending(t)}
                  title={t.is_pending_confirm ? '取消待確認' : '標記待確認'}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 15, padding: '2px 3px', lineHeight: 1, flexShrink: 0,
                    color: t.is_pending_confirm ? 'var(--orange)' : 'var(--text-secondary)',
                  }}
                >🔔</button>

                {/* 刪除 */}
                <button
                  onClick={() => onDelete(t)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 15, padding: '2px 3px', lineHeight: 1, flexShrink: 0,
                    color: 'var(--text-secondary)',
                  }}
                >🗑️</button>
              </div>
            ))}
          </div>
        ))}

        {/* 新增區 */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 4 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            <input
              value={assignee}
              onChange={e => setAssignee(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="負責人"
              maxLength={20}
              style={{ ...inp, flex: '1 1 80px', minWidth: 80 }}
              onFocus={e => e.target.style.borderColor = 'var(--blue)'}
              onBlur={e  => e.target.style.borderColor = 'var(--border)'}
            />
            <input
              value={content}
              onChange={e => setContent(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="任務內容"
              maxLength={200}
              style={{ ...inp, flex: '3 1 180px', minWidth: 150 }}
              onFocus={e => e.target.style.borderColor = 'var(--blue)'}
              onBlur={e  => e.target.style.borderColor = 'var(--border)'}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isPending}
                onChange={e => setIsPending(e.target.checked)}
                style={{ accentColor: 'var(--orange)', width: 15, height: 15 }}
              />
              標記待確認
            </label>
            <button
              onClick={handleAdd}
              disabled={adding || !assignee.trim() || !content.trim()}
              style={{
                background: 'var(--blue)', color: '#fff',
                border: 'none', borderRadius: 8,
                padding: '7px 18px', fontSize: 14, fontWeight: 600,
                cursor: adding || !assignee.trim() || !content.trim() ? 'not-allowed' : 'pointer',
                opacity: adding || !assignee.trim() || !content.trim() ? 0.6 : 1,
              }}
            >新增</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── 主頁面 ──
export default function Weekly() {
  const navigate = useNavigate()
  const [plans,   setPlans]   = useState([])
  const [tasks,   setTasks]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const todayWeekStart = getCurrentWeekStart()
    const todayWeekEnd   = getWeekEnd(todayWeekStart)

    const [{ data: plansData }, { data: tasksData }] = await Promise.all([
      supabase.from('weekly_plans').select('*').order('week_start', { ascending: false }),
      supabase.from('weekly_tasks').select('*').order('created_at', { ascending: true }),
    ])

    let allPlans = plansData ?? []
    const currentExists = allPlans.some(p => p.week_start === todayWeekStart)

    if (!currentExists) {
      const { data: newPlan } = await supabase
        .from('weekly_plans')
        .insert({ week_start: todayWeekStart, week_end: todayWeekEnd })
        .select().single()
      if (newPlan) allPlans = [newPlan, ...allPlans]
    }

    setPlans(allPlans)
    setTasks(tasksData ?? [])
    setLoading(false)
  }

  async function handleToggleDone(task) {
    const newDone = !task.is_done
    const { error } = await supabase
      .from('weekly_tasks')
      .update({ is_done: newDone, done_at: newDone ? new Date().toISOString() : null })
      .eq('id', task.id)
    if (error) { alert('操作失敗，請重試'); return }
    setTasks(prev => prev.map(t =>
      t.id === task.id ? { ...t, is_done: newDone, done_at: newDone ? new Date().toISOString() : null } : t
    ))
  }

  async function handleTogglePending(task) {
    const newPending = !task.is_pending_confirm
    const { error } = await supabase
      .from('weekly_tasks')
      .update({ is_pending_confirm: newPending })
      .eq('id', task.id)
    if (error) { alert('操作失敗，請重試'); return }
    setTasks(prev => prev.map(t =>
      t.id === task.id ? { ...t, is_pending_confirm: newPending } : t
    ))
  }

  async function handleDelete(task) {
    if (!window.confirm(`確定要刪除「${task.content}」嗎？`)) return
    const { error } = await supabase.from('weekly_tasks').delete().eq('id', task.id)
    if (error) { alert('操作失敗，請重試'); return }
    setTasks(prev => prev.filter(t => t.id !== task.id))
  }

  async function handleAdd(planId, assignee, content, isPending) {
    const { data, error } = await supabase
      .from('weekly_tasks')
      .insert({ plan_id: planId, assignee, content, is_pending_confirm: isPending })
      .select().single()
    if (error) { alert('操作失敗，請重試'); return false }
    setTasks(prev => [...prev, data])
    return true
  }

  const currentPlan  = plans[0] ?? null
  const historyPlans = plans.slice(1)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header style={{
        background: 'var(--card)', borderBottom: '1px solid var(--border)',
        height: 56, padding: '0 20px',
        display: 'flex', alignItems: 'center', gap: 12,
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button
          onClick={() => navigate('/')}
          style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--text-secondary)', padding: '4px 8px', borderRadius: 8, lineHeight: 1, cursor: 'pointer' }}
        >←</button>
        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>週工作看板</span>
      </header>

      <main style={{ padding: '20px 16px', maxWidth: 640, margin: '0 auto' }}>

        {loading && (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 48 }}>載入中...</p>
        )}

        {!loading && currentPlan && (
          <CurrentWeek
            plan={currentPlan}
            tasks={tasks.filter(t => t.plan_id === currentPlan.id)}
            onToggleDone={handleToggleDone}
            onTogglePending={handleTogglePending}
            onDelete={handleDelete}
            onAdd={handleAdd}
          />
        )}

        {!loading && historyPlans.length > 0 && (
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>
              歷史紀錄
            </div>
            {historyPlans.map(p => (
              <HistoryWeek
                key={p.id}
                plan={p}
                tasks={tasks.filter(t => t.plan_id === p.id)}
              />
            ))}
          </div>
        )}

      </main>
    </div>
  )
}

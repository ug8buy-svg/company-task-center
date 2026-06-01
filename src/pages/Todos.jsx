import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function formatTime(isoStr) {
  const d = new Date(isoStr)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// ── 單筆待辦項目 ──
function TodoItem({ todo, isNew, onToggle, onDelete, onNotify }) {
  const [delHover, setDelHover] = useState(false)

  return (
    <div
      className={isNew ? 'slide-in-top' : ''}
      style={{
        background: todo.is_done ? 'var(--bg)' : 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        opacity: todo.is_done ? 0.65 : 1,
        transition: 'opacity 0.25s',
      }}
    >
      {/* 勾選框（外層 44×44 擴大觸控範圍，內層維持 22×22 視覺） */}
      <div
        onClick={() => onToggle(todo)}
        style={{ padding: 10, margin: -10, flexShrink: 0, cursor: 'pointer' }}
      >
        <div style={{
          width: 22, height: 22,
          borderRadius: 6,
          border: `2px solid ${todo.is_done ? 'var(--blue)' : 'var(--border)'}`,
          background: todo.is_done ? 'var(--blue)' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.18s',
        }}>
          {todo.is_done && <span style={{ color: '#fff', fontSize: 13, lineHeight: 1 }}>✓</span>}
        </div>
      </div>

      {/* 內容 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 15,
          color: todo.is_done ? 'var(--text-secondary)' : 'var(--text-primary)',
          textDecoration: todo.is_done ? 'line-through' : 'none',
          wordBreak: 'break-all',
          lineHeight: 1.5,
        }}>
          {todo.content}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
          建立：{formatTime(todo.created_at)}
          {todo.done_at && `　完成：${formatTime(todo.done_at)}`}
        </div>
      </div>

      {/* LINE 通知按鈕（只有未完成才顯示） */}
      {!todo.is_done && (
        <button
          onClick={() => onNotify(todo)}
          style={{
            background: '#06C755', color: '#fff',
            border: 'none', borderRadius: 6,
            padding: '5px 9px', fontSize: 12, fontWeight: 700,
            cursor: 'pointer', flexShrink: 0, lineHeight: 1.4,
          }}
        >LINE</button>
      )}

      {/* 刪除按鈕 */}
      <button
        onClick={() => onDelete(todo)}
        onMouseEnter={() => setDelHover(true)}
        onMouseLeave={() => setDelHover(false)}
        style={{
          background: 'none', border: 'none',
          fontSize: 18,
          color: delHover ? 'var(--red)' : 'var(--text-secondary)',
          padding: 10, borderRadius: 6,
          lineHeight: 1, flexShrink: 0,
          transition: 'color 0.18s',
        }}
      >🗑️</button>
    </div>
  )
}

// ── 主頁面 ──
export default function Todos() {
  const navigate = useNavigate()
  const [todos,      setTodos]     = useState([])
  const [loading,    setLoading]   = useState(true)
  const [input,      setInput]     = useState('')
  const [inputError, setInputError] = useState(false)
  const [newIds,     setNewIds]    = useState(new Set())
  const [bossLineId, setBossLineId] = useState(null)
  const [toast,      setToast]     = useState(null) // 'success' | 'error' | null

  useEffect(() => {
    fetchTodos()
    fetchBossLineId()
  }, [])

  async function fetchTodos() {
    setLoading(true)
    const { data, error } = await supabase
      .from('boss_todos')
      .select('*')
      .order('created_at', { ascending: true })
    if (!error) setTodos(data ?? [])
    setLoading(false)
  }

  async function fetchBossLineId() {
    const { data } = await supabase
      .from('users')
      .select('line_id')
      .eq('role', 'boss')
      .single()
    if (data?.line_id) setBossLineId(data.line_id)
  }

  async function sendTodoNotification(todo) {
    if (!bossLineId) { alert('無法取得通知設定，請稍後再試'); return }
    if (!window.confirm(`確定要發送 LINE 通知給劉姐嗎？\n內容：${todo.content}`)) return

    const message = `📌 待辦提醒\n\n${todo.content}\n\n請儘速確認並完成此項目。\n— 公司任務中心`
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-line-notification`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ line_id: bossLineId, message }),
        }
      )
      setToast(res.ok ? 'success' : 'error')
    } catch {
      setToast('error')
    }
    setTimeout(() => setToast(null), 1500)
  }

  async function addTodo() {
    const text = input.trim()
    if (!text) { setInputError(true); return }

    const { data, error } = await supabase
      .from('boss_todos')
      .insert({ content: text })
      .select()
      .single()

    if (error) { alert('操作失敗，請重試'); return }
    setTodos(prev => [data, ...prev])
    setNewIds(prev => new Set([...prev, data.id]))
    setTimeout(() => setNewIds(prev => {
      const next = new Set(prev); next.delete(data.id); return next
    }), 500)
    setInput('')
    setInputError(false)
  }

  async function toggleTodo(todo) {
    const update = todo.is_done
      ? { is_done: false, done_at: null }
      : { is_done: true,  done_at: new Date().toISOString() }

    const { error } = await supabase
      .from('boss_todos')
      .update(update)
      .eq('id', todo.id)

    if (error) { alert('操作失敗，請重試'); return }
    setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, ...update } : t))
  }

  async function deleteTodo(todo) {
    if (!window.confirm(`確定要刪除這筆待辦嗎？\n「${todo.content}」`)) return

    const { error } = await supabase
      .from('boss_todos')
      .delete()
      .eq('id', todo.id)

    if (error) { alert('操作失敗，請重試'); return }
    setTodos(prev => prev.filter(t => t.id !== todo.id))
  }

  const undone = todos.filter(t => !t.is_done)
  const done   = todos.filter(t =>  t.is_done)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Toast 提示 */}
      {toast && (
        <div style={{
          position: 'fixed', top: 68, left: '50%', transform: 'translateX(-50%)',
          background: toast === 'success' ? '#06C755' : 'var(--red)',
          color: '#fff', padding: '8px 20px', borderRadius: 20,
          fontSize: 14, fontWeight: 600, zIndex: 100,
          whiteSpace: 'nowrap', boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
          pointerEvents: 'none',
        }}>
          {toast === 'success' ? '✅ 通知已發送' : '❌ 發送失敗，請重試'}
        </div>
      )}

      {/* 頂部標題列 */}
      <header style={{
        background: 'var(--card)',
        borderBottom: '1px solid var(--border)',
        height: 56, padding: '0 20px',
        display: 'flex', alignItems: 'center', gap: 12,
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button
          onClick={() => navigate('/')}
          style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--text-secondary)', padding: '4px 8px', borderRadius: 8, lineHeight: 1 }}
        >←</button>
        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>劉姐待辦清單</span>
      </header>

      <main style={{ padding: '20px 16px', maxWidth: 600, margin: '0 auto' }}>

        {/* 新增區 */}
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 14, padding: 16, marginBottom: 24,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              type="text"
              value={input}
              onChange={e => { setInput(e.target.value); setInputError(false) }}
              onKeyDown={e => e.key === 'Enter' && addTodo()}
              placeholder="輸入待辦事項..."
              maxLength={200}
              style={{
                width: '100%', padding: '10px 14px',
                border: `2px solid ${inputError ? 'var(--red)' : 'var(--border)'}`,
                borderRadius: 10, fontSize: 15,
                background: 'var(--bg)', color: 'var(--text-primary)',
                outline: 'none', fontFamily: 'inherit',
                transition: 'border-color 0.18s', boxSizing: 'border-box',
              }}
              onFocus={e => { if (!inputError) e.target.style.borderColor = 'var(--blue)' }}
              onBlur={e  => { if (!inputError) e.target.style.borderColor = 'var(--border)' }}
            />
            <button
              onClick={addTodo}
              style={{
                background: 'var(--blue)', color: '#fff',
                border: 'none', borderRadius: 10,
                padding: '10px 20px', fontSize: 15, fontWeight: 600,
                whiteSpace: 'nowrap', alignSelf: 'flex-end', cursor: 'pointer',
              }}
            >新增</button>
          </div>
          {inputError && (
            <p style={{ color: 'var(--red)', fontSize: 13, marginTop: 8 }}>請輸入待辦內容</p>
          )}
        </div>

        {/* 載入中 */}
        {loading && (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 48 }}>載入中...</p>
        )}

        {/* 空狀態 */}
        {!loading && todos.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 48 }}>目前沒有待辦事項</p>
        )}

        {/* 未完成清單 */}
        {!loading && undone.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
            {undone.map(todo => (
              <TodoItem
                key={todo.id} todo={todo} isNew={newIds.has(todo.id)}
                onToggle={toggleTodo} onDelete={deleteTodo} onNotify={sendTodoNotification}
              />
            ))}
          </div>
        )}

        {/* 已完成清單 */}
        {!loading && done.length > 0 && (
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 10 }}>
              已完成（{done.length}）
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {done.map(todo => (
                <TodoItem
                  key={todo.id} todo={todo} isNew={false}
                  onToggle={toggleTodo} onDelete={deleteTodo} onNotify={sendTodoNotification}
                />
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  )
}

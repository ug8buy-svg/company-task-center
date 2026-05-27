import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function formatTime(isoStr) {
  const d = new Date(isoStr)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function TodoItem({ todo, isNew, onToggle, onDelete }) {
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

export default function StaffTodos() {
  const navigate = useNavigate()
  const [todos,   setTodos]   = useState([])
  const [loading, setLoading] = useState(true)
  const [input,   setInput]   = useState('')
  const [inputError, setInputError] = useState(false)
  const [newIds,  setNewIds]  = useState(new Set())

  useEffect(() => { fetchTodos() }, [])

  async function fetchTodos() {
    setLoading(true)
    const { data, error } = await supabase
      .from('staff_todos')
      .select('*')
      .order('created_at', { ascending: true })
    if (!error) setTodos(data ?? [])
    setLoading(false)
  }

  async function addTodo() {
    const text = input.trim()
    if (!text) { setInputError(true); return }

    const { data, error } = await supabase
      .from('staff_todos')
      .insert({ content: text })
      .select()
      .single()

    if (!error && data) {
      setTodos(prev => [data, ...prev])
      setNewIds(prev => new Set([...prev, data.id]))
      setTimeout(() => setNewIds(prev => {
        const next = new Set(prev); next.delete(data.id); return next
      }), 500)
      setInput('')
      setInputError(false)
    }
  }

  async function toggleTodo(todo) {
    const update = todo.is_done
      ? { is_done: false, done_at: null }
      : { is_done: true,  done_at: new Date().toISOString() }

    const { error } = await supabase
      .from('staff_todos')
      .update(update)
      .eq('id', todo.id)

    if (!error) setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, ...update } : t))
  }

  async function deleteTodo(todo) {
    if (!window.confirm(`確定要刪除這筆待辦嗎？\n「${todo.content}」`)) return

    const { error } = await supabase
      .from('staff_todos')
      .delete()
      .eq('id', todo.id)

    if (!error) setTodos(prev => prev.filter(t => t.id !== todo.id))
  }

  const undone = todos.filter(t => !t.is_done)
  const done   = todos.filter(t =>  t.is_done)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      <header style={{
        background: 'var(--card)',
        borderBottom: '1px solid var(--border)',
        height: 56, padding: '0 20px',
        display: 'flex', alignItems: 'center', gap: 12,
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button
          onClick={() => navigate('/')}
          style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--text-secondary)', padding: '4px 8px', borderRadius: 8, lineHeight: 1, cursor: 'pointer' }}
        >←</button>
        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>仕庭待辦清單</span>
      </header>

      <main style={{ padding: '20px 16px', maxWidth: 600, margin: '0 auto' }}>

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

        {loading && (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 48 }}>載入中...</p>
        )}

        {!loading && todos.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 48 }}>目前沒有待辦事項</p>
        )}

        {!loading && undone.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
            {undone.map(todo => (
              <TodoItem key={todo.id} todo={todo} isNew={newIds.has(todo.id)} onToggle={toggleTodo} onDelete={deleteTodo} />
            ))}
          </div>
        )}

        {!loading && done.length > 0 && (
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 10 }}>
              已完成（{done.length}）
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {done.map(todo => (
                <TodoItem key={todo.id} todo={todo} isNew={false} onToggle={toggleTodo} onDelete={deleteTodo} />
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function formatTime(isoStr) {
  const d = new Date(isoStr)
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function NoteCard({ note, isNew, onDelete, onNotify }) {
  const [delHover, setDelHover] = useState(false)

  return (
    <div
      className={isNew ? 'slide-in-top' : ''}
      style={{
        background: 'var(--note-bg)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '14px 16px',
      }}
    >
      {/* 頂部列：建立時間 + 按鈕群 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          {formatTime(note.created_at)}
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {/* LINE 通知按鈕 */}
          <button
            onClick={() => onNotify(note)}
            style={{
              background: '#06C755', color: '#fff',
              border: 'none', borderRadius: 6,
              padding: '4px 9px', fontSize: 12, fontWeight: 700,
              cursor: 'pointer', lineHeight: 1.4,
            }}
          >LINE</button>
          {/* 刪除按鈕 */}
          <button
            onClick={() => onDelete(note)}
            onMouseEnter={() => setDelHover(true)}
            onMouseLeave={() => setDelHover(false)}
            style={{
              background: 'none', border: 'none',
              fontSize: 16,
              color: delHover ? 'var(--red)' : 'var(--text-secondary)',
              padding: '4px 6px', borderRadius: 6, lineHeight: 1,
              transition: 'color 0.18s', cursor: 'pointer',
            }}
          >🗑️</button>
        </div>
      </div>

      {/* 備注內容（white-space: pre-wrap 保留換行） */}
      <div style={{
        fontSize: 15,
        color: 'var(--text-primary)',
        lineHeight: 1.7,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
      }}>
        {note.content}
      </div>
    </div>
  )
}

export default function Notes() {
  const navigate = useNavigate()
  const [notes,      setNotes]     = useState([])
  const [loading,    setLoading]   = useState(true)
  const [input,      setInput]     = useState('')
  const [inputError, setInputError] = useState(false)
  const [newIds,     setNewIds]    = useState(new Set())
  const [bossLineId, setBossLineId] = useState(null)
  const [toast,      setToast]     = useState(null) // 'success' | 'error' | null

  useEffect(() => {
    fetchNotes()
    fetchBossLineId()
  }, [])

  async function fetchNotes() {
    setLoading(true)
    const { data, error } = await supabase
      .from('boss_notes')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error) setNotes(data ?? [])
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

  async function sendNoteNotification(note) {
    if (!bossLineId) { alert('無法取得通知設定，請稍後再試'); return }
    const preview = note.content.slice(0, 30) + (note.content.length > 30 ? '...' : '')
    if (!window.confirm(`確定要發送 LINE 通知給劉姐嗎？\n內容：${preview}`)) return

    const message = `📝 備注提醒\n\n${note.content}\n\n— 公司任務中心`
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

  async function addNote() {
    const text = input.trim()
    if (!text) { setInputError(true); return }

    const { data, error } = await supabase
      .from('boss_notes')
      .insert({ content: text })
      .select()
      .single()

    if (error) { alert('操作失敗，請重試'); return }
    setNotes(prev => [data, ...prev])
    setNewIds(prev => new Set([...prev, data.id]))
    setTimeout(() => setNewIds(prev => {
      const next = new Set(prev); next.delete(data.id); return next
    }), 500)
    setInput('')
    setInputError(false)
  }

  async function deleteNote(note) {
    if (!window.confirm(`確定要刪除這筆備注嗎？`)) return

    const { error } = await supabase
      .from('boss_notes')
      .delete()
      .eq('id', note.id)

    if (error) { alert('操作失敗，請重試'); return }
    setNotes(prev => prev.filter(n => n.id !== note.id))
  }

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
        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>劉姐專屬備注</span>
      </header>

      <main style={{ padding: '20px 16px', maxWidth: 600, margin: '0 auto' }}>

        {/* 新增區 */}
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 14, padding: 16, marginBottom: 24,
        }}>
          <textarea
            value={input}
            onChange={e => { setInput(e.target.value); setInputError(false) }}
            placeholder="輸入備注內容…（Shift+Enter 換行）"
            rows={4}
            maxLength={2000}
            style={{
              width: '100%',
              padding: '10px 14px',
              border: `2px solid ${inputError ? 'var(--red)' : 'var(--border)'}`,
              borderRadius: 10, fontSize: 15,
              background: 'var(--bg)', color: 'var(--text-primary)',
              outline: 'none', fontFamily: 'inherit',
              resize: 'vertical', lineHeight: 1.6,
              transition: 'border-color 0.18s',
              boxSizing: 'border-box',
            }}
            onFocus={e => { if (!inputError) e.target.style.borderColor = 'var(--blue)' }}
            onBlur={e  => { if (!inputError) e.target.style.borderColor = 'var(--border)' }}
          />
          {inputError && (
            <p style={{ color: 'var(--red)', fontSize: 13, margin: '6px 0 8px' }}>請輸入備注內容</p>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
            <button
              onClick={addNote}
              style={{
                background: 'var(--blue)', color: '#fff',
                border: 'none', borderRadius: 10,
                padding: '10px 24px', fontSize: 15, fontWeight: 600,
                cursor: 'pointer',
              }}
            >新增</button>
          </div>
        </div>

        {/* 載入中 */}
        {loading && (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 48 }}>載入中...</p>
        )}

        {/* 空狀態 */}
        {!loading && notes.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 48 }}>目前沒有備注</p>
        )}

        {/* 備注清單 */}
        {!loading && notes.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {notes.map(note => (
              <NoteCard
                key={note.id}
                note={note}
                isNew={newIds.has(note.id)}
                onDelete={deleteNote}
                onNotify={sendNoteNotification}
              />
            ))}
          </div>
        )}

      </main>
    </div>
  )
}

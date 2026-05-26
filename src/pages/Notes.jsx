import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function formatTime(isoStr) {
  const d = new Date(isoStr)
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function NoteCard({ note, isNew, onDelete }) {
  const [delHover, setDelHover] = useState(false)

  return (
    <div
      className={isNew ? 'slide-in-top' : ''}
      style={{
        background: 'var(--note-bg)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '14px 16px',
        position: 'relative',
      }}
    >
      {/* 右上角刪除按鈕 */}
      <button
        onClick={() => onDelete(note)}
        onMouseEnter={() => setDelHover(true)}
        onMouseLeave={() => setDelHover(false)}
        style={{
          position: 'absolute', top: 10, right: 10,
          background: 'none', border: 'none',
          fontSize: 16,
          color: delHover ? 'var(--red)' : 'var(--text-secondary)',
          padding: '4px 6px', borderRadius: 6, lineHeight: 1,
          transition: 'color 0.18s',
        }}
      >🗑️</button>

      {/* 建立時間 */}
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
        {formatTime(note.created_at)}
      </div>

      {/* 備注內容（white-space: pre-wrap 保留換行） */}
      <div style={{
        fontSize: 15,
        color: 'var(--text-primary)',
        lineHeight: 1.7,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
        paddingRight: 28,
      }}>
        {note.content}
      </div>
    </div>
  )
}

export default function Notes() {
  const navigate = useNavigate()
  const [notes,   setNotes]   = useState([])
  const [loading, setLoading] = useState(true)
  const [input,   setInput]   = useState('')
  const [inputError, setInputError] = useState(false)
  const [newIds,  setNewIds]  = useState(new Set())

  useEffect(() => { fetchNotes() }, [])

  async function fetchNotes() {
    setLoading(true)
    const { data, error } = await supabase
      .from('boss_notes')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error) setNotes(data ?? [])
    setLoading(false)
  }

  async function addNote() {
    const text = input.trim()
    if (!text) { setInputError(true); return }

    const { data, error } = await supabase
      .from('boss_notes')
      .insert({ content: text })
      .select()
      .single()

    if (!error && data) {
      setNotes(prev => [data, ...prev])
      setNewIds(prev => new Set([...prev, data.id]))
      setTimeout(() => setNewIds(prev => {
        const next = new Set(prev); next.delete(data.id); return next
      }), 500)
      setInput('')
      setInputError(false)
    }
  }

  async function deleteNote(note) {
    if (!window.confirm(`確定要刪除這筆備注嗎？`)) return

    const { error } = await supabase
      .from('boss_notes')
      .delete()
      .eq('id', note.id)

    if (!error) setNotes(prev => prev.filter(n => n.id !== note.id))
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

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
              />
            ))}
          </div>
        )}

      </main>
    </div>
  )
}

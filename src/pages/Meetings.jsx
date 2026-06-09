import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const SPEAKERS = ['劉姐', '阿緯', '仕庭']
const LS_SPEAKER = 'meeting_speaker'
const LS_ENDED  = 'ended_meeting_ids'

function getEndedIds() {
  try { return JSON.parse(localStorage.getItem(LS_ENDED) || '[]') } catch { return [] }
}
function addEndedId(id) {
  const ids = getEndedIds()
  if (!ids.includes(id)) localStorage.setItem(LS_ENDED, JSON.stringify([...ids, id]))
}

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatTime(isoStr) {
  const d = new Date(isoStr)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatDate(isoStr) {
  const d = new Date(isoStr)
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
}

// ── 條目列 ──
function EntryRow({ entry, onDelete, onEdit }) {
  const [delHover, setDelHover] = useState(false)
  const [editing, setEditing]   = useState(false)
  const [editInput, setEditInput] = useState(entry.content)
  const textareaRef = useRef(null)

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.selectionStart = textareaRef.current.value.length
    }
  }, [editing])

  function startEdit() {
    setEditInput(entry.content)
    setEditing(true)
  }

  async function saveEdit() {
    const text = editInput.trim()
    if (!text || text === entry.content) { setEditing(false); return }
    await onEdit(entry, text)
    setEditing(false)
  }

  function cancelEdit() {
    setEditInput(entry.content)
    setEditing(false)
  }

  return (
    <div style={{
      background: 'var(--card)', border: `1px solid ${editing ? 'var(--blue)' : 'var(--border)'}`,
      borderRadius: 10, padding: '10px 14px', marginBottom: 8,
      display: 'flex', gap: 12, alignItems: 'flex-start',
    }}>
      {editing ? (
        <div style={{ flex: 1 }}>
          <textarea
            ref={textareaRef}
            value={editInput}
            onChange={e => setEditInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit() }
              if (e.key === 'Escape') cancelEdit()
            }}
            rows={3}
            maxLength={2000}
            style={{
              width: '100%', padding: '6px 10px', fontSize: 15,
              border: '1px solid var(--blue)', borderRadius: 8,
              background: 'var(--bg)', color: 'var(--text-primary)',
              outline: 'none', fontFamily: 'inherit', lineHeight: 1.6,
              resize: 'vertical', boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', gap: 6, marginTop: 6, justifyContent: 'flex-end' }}>
            <button
              onClick={cancelEdit}
              style={{
                background: 'none', border: '1px solid var(--border)',
                color: 'var(--text-secondary)', borderRadius: 6,
                padding: '4px 12px', fontSize: 13, cursor: 'pointer',
              }}
            >取消</button>
            <button
              onClick={saveEdit}
              style={{
                background: 'var(--blue)', color: '#fff', border: 'none',
                borderRadius: 6, padding: '4px 14px', fontSize: 13,
                fontWeight: 600, cursor: 'pointer',
              }}
            >儲存</button>
          </div>
        </div>
      ) : (
        <>
          <div
            onClick={onEdit ? startEdit : undefined}
            style={{
              flex: 1, fontSize: 15, color: 'var(--text-primary)',
              whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.6,
              cursor: onEdit ? 'text' : 'default',
            }}
          >
            {entry.content}
          </div>
          <div style={{ flexShrink: 0, textAlign: 'right' }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
              {entry.created_by_name}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
              {formatTime(entry.created_at)}
            </div>
            {onDelete && (
              <button
                onClick={() => onDelete(entry)}
                onMouseEnter={() => setDelHover(true)}
                onMouseLeave={() => setDelHover(false)}
                style={{
                  background: 'none', border: 'none', padding: '2px 0',
                  fontSize: 14, color: delHover ? 'var(--red)' : 'var(--border)',
                  cursor: 'pointer', marginTop: 4, lineHeight: 1, transition: 'color 0.15s',
                }}
              >🗑️</button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ── 歷史會議卡片 ──
function PastMeetingCard({ meeting, entries }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 12, overflow: 'hidden', marginBottom: 10,
    }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', background: 'none', border: 'none',
          padding: '14px 16px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 16, color: 'var(--text-secondary)', flexShrink: 0 }}>{open ? '▾' : '▸'}</span>
        <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{meeting.title}</span>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)', flexShrink: 0 }}>{entries.length} 條</span>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', flexShrink: 0 }}>{formatDate(meeting.meeting_date)}</span>
      </button>
      {open && (
        <div style={{ padding: '0 16px 14px' }}>
          {entries.length === 0 ? (
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', padding: '12px 0' }}>沒有條目</p>
          ) : (
            entries.map(e => <EntryRow key={e.id} entry={e} />)
          )}
        </div>
      )}
    </div>
  )
}

// ── 主頁面 ──
export default function Meetings() {
  const navigate = useNavigate()
  const [loading, setLoading]           = useState(true)
  const [activeMeeting, setActiveMeeting] = useState(null)
  const [entries, setEntries]           = useState([])
  const [pastMeetings, setPastMeetings] = useState([])
  const [allPastEntries, setAllPastEntries] = useState([])

  // 新增條目
  const [speaker, setSpeaker] = useState(() => localStorage.getItem(LS_SPEAKER) || '我')
  const [input, setInput]     = useState('')

  // 建立新會議
  const [showCreate, setShowCreate] = useState(false)
  const [newTitle, setNewTitle]     = useState('')
  const [newDate, setNewDate]       = useState(todayStr)

  const channelRef = useRef(null)
  const entriesEndRef = useRef(null)

  useEffect(() => { fetchAll() }, [])

  useEffect(() => {
    if (entriesEndRef.current) entriesEndRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [entries])

  useEffect(() => {
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current) }
  }, [])

  async function fetchAll() {
    setLoading(true)

    const { data: meetings } = await supabase
      .from('meetings')
      .select('*')
      .order('created_at', { ascending: false })

    const allMeetings = meetings ?? []
    const endedIds = getEndedIds()

    // 最新那場，如果不在已結束清單裡，就是 active
    const latest = allMeetings[0] ?? null
    const isActive = latest && !endedIds.includes(latest.id)
    const active = isActive ? latest : null
    const past   = isActive ? allMeetings.slice(1) : allMeetings

    setActiveMeeting(active)
    setPastMeetings(past)

    // 讀取所有條目
    const { data: allEntries } = await supabase
      .from('meeting_entries')
      .select('*')
      .order('created_at', { ascending: true })

    const allE = allEntries ?? []
    if (active) {
      setEntries(allE.filter(e => e.meeting_id === active.id))
      setAllPastEntries(allE.filter(e => e.meeting_id !== active.id))
      subscribeRealtime(active.id)
    } else {
      setAllPastEntries(allE)
    }

    setLoading(false)
  }

  function subscribeRealtime(meetingId) {
    if (channelRef.current) supabase.removeChannel(channelRef.current)
    const ch = supabase
      .channel(`meeting_entries_${meetingId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'meeting_entries',
        filter: `meeting_id=eq.${meetingId}`,
      }, payload => {
        setEntries(prev => {
          if (prev.find(e => e.id === payload.new.id)) return prev
          return [...prev, payload.new]
        })
      })
      .subscribe()
    channelRef.current = ch
  }

  async function handleCreateMeeting() {
    const title = newTitle.trim()
    if (!title || !newDate) return
    const { data, error } = await supabase
      .from('meetings')
      .insert({ title, meeting_date: newDate })
      .select()
      .single()
    if (error) { alert('操作失敗，請重試'); return }
    setActiveMeeting(data)
    setEntries([])
    setPastMeetings(prev => activeMeeting ? [activeMeeting, ...prev] : prev)
    setShowCreate(false)
    setNewTitle('')
    setNewDate(todayStr())
    subscribeRealtime(data.id)
  }

  async function handleAddEntry() {
    const text = input.trim()
    if (!text || !activeMeeting) return
    const { data, error } = await supabase
      .from('meeting_entries')
      .insert({ meeting_id: activeMeeting.id, content: text, created_by_name: speaker })
      .select()
      .single()
    if (error) { alert('操作失敗，請重試'); return }
    setEntries(prev => [...prev, data])
    setInput('')
  }

  async function handleDeleteEntry(entry) {
    if (!window.confirm('確定要刪除這筆記錄嗎？')) return
    const { error } = await supabase.from('meeting_entries').delete().eq('id', entry.id)
    if (error) { alert('操作失敗，請重試'); return }
    setEntries(prev => prev.filter(e => e.id !== entry.id))
  }

  async function handleEditEntry(entry, newContent) {
    const { error } = await supabase
      .from('meeting_entries')
      .update({ content: newContent })
      .eq('id', entry.id)
    if (error) { alert('操作失敗，請重試'); return }
    setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, content: newContent } : e))
  }

  function handleSpeakerChange(s) {
    setSpeaker(s)
    localStorage.setItem(LS_SPEAKER, s)
  }

  async function handleEndMeeting() {
    if (!activeMeeting) return
    if (!window.confirm('確定要結束這場會議嗎？記錄會保留在歷史會議中。')) return
    addEndedId(activeMeeting.id)
    if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null }
    setPastMeetings(prev => [activeMeeting, ...prev])
    setAllPastEntries(prev => [...prev, ...entries])
    setActiveMeeting(null)
    setEntries([])
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* 頂部標題列 */}
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
        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', flex: 1 }}>會議記錄</span>
        {activeMeeting && (
          <button
            onClick={handleEndMeeting}
            style={{
              background: 'none', border: '1px solid var(--border)', color: 'var(--text-secondary)',
              borderRadius: 10, padding: '6px 14px', fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >結束會議</button>
        )}
        {!activeMeeting && !loading && (
          <button
            onClick={() => setShowCreate(v => !v)}
            style={{
              background: 'var(--blue)', color: '#fff', border: 'none',
              borderRadius: 10, padding: '7px 14px', fontSize: 14, fontWeight: 600,
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >＋ 開始新會議</button>
        )}
      </header>

      <main style={{ padding: '20px 16px', maxWidth: 640, margin: '0 auto' }}>

        {loading && (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 48 }}>載入中...</p>
        )}

        {!loading && (
          <>
            {/* ── 建立新會議表單 ── */}
            {!activeMeeting && showCreate && (
              <div className="slide-in-top" style={{
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: 14, padding: 18, marginBottom: 20,
              }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 14 }}>開始新會議</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCreateMeeting()}
                    placeholder="會議名稱（例：5月旅展討論）"
                    maxLength={100}
                    style={{
                      padding: '9px 12px', fontSize: 14,
                      border: '1px solid var(--border)', borderRadius: 8,
                      background: 'var(--bg)', color: 'var(--text-primary)',
                      outline: 'none', fontFamily: 'inherit',
                    }}
                    onFocus={e => e.target.style.borderColor = 'var(--blue)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                  <input
                    type="date"
                    value={newDate}
                    onChange={e => setNewDate(e.target.value)}
                    style={{
                      padding: '9px 12px', fontSize: 14,
                      border: '1px solid var(--border)', borderRadius: 8,
                      background: 'var(--bg)', color: 'var(--text-primary)',
                      outline: 'none', fontFamily: 'inherit',
                    }}
                  />
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => setShowCreate(false)}
                      style={{
                        background: 'none', border: '1px solid var(--border)', color: 'var(--text-secondary)',
                        borderRadius: 8, padding: '8px 14px', fontSize: 14, cursor: 'pointer',
                      }}
                    >取消</button>
                    <button
                      onClick={handleCreateMeeting}
                      style={{
                        background: 'var(--blue)', color: '#fff', border: 'none',
                        borderRadius: 8, padding: '8px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                      }}
                    >開始會議</button>
                  </div>
                </div>
              </div>
            )}

            {/* ── 無進行中會議的提示 ── */}
            {!activeMeeting && !showCreate && pastMeetings.length === 0 && (
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '32px 0' }}>
                目前沒有進行中的會議，點「＋ 開始新會議」建立
              </p>
            )}

            {/* ── 進行中的會議 ── */}
            {activeMeeting && (
              <div style={{
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: 16, padding: '18px 18px 14px', marginBottom: 24,
              }}>
                {/* 會議標題 */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{activeMeeting.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{formatDate(activeMeeting.meeting_date)}</div>
                </div>

                {/* 條目清單 */}
                <div style={{ marginBottom: 16 }}>
                  {entries.length === 0 ? (
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', padding: '16px 0' }}>會議開始，可以新增第一筆條目</p>
                  ) : (
                    entries.map(e => <EntryRow key={e.id} entry={e} onDelete={handleDeleteEntry} onEdit={handleEditEntry} />)
                  )}
                  <div ref={entriesEndRef} />
                </div>

                {/* 發言者選擇 */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  {SPEAKERS.map(s => (
                    <button
                      key={s}
                      onClick={() => handleSpeakerChange(s)}
                      style={{
                        flex: 1, padding: '7px 0', fontSize: 14, borderRadius: 8, cursor: 'pointer',
                        border: `1px solid ${speaker === s ? 'var(--blue)' : 'var(--border)'}`,
                        background: speaker === s ? 'var(--blue)' : 'var(--bg)',
                        color: speaker === s ? '#fff' : 'var(--text-secondary)',
                        fontWeight: speaker === s ? 600 : 400,
                        transition: 'all 0.15s',
                      }}
                    >{s}</button>
                  ))}
                </div>

                {/* 輸入框 */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddEntry() } }}
                    placeholder="輸入條目…（Shift+Enter 換行，Enter 送出）"
                    rows={3}
                    maxLength={2000}
                    style={{
                      flex: 1, padding: '9px 12px', fontSize: 14, resize: 'vertical',
                      border: '1px solid var(--border)', borderRadius: 8,
                      background: 'var(--bg)', color: 'var(--text-primary)',
                      outline: 'none', fontFamily: 'inherit', lineHeight: 1.6,
                    }}
                    onFocus={e => e.target.style.borderColor = 'var(--blue)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                  <button
                    onClick={handleAddEntry}
                    style={{
                      background: 'var(--blue)', color: '#fff', border: 'none',
                      borderRadius: 8, padding: '0 16px', fontSize: 14, fontWeight: 600,
                      cursor: 'pointer', alignSelf: 'stretch',
                    }}
                  >新增</button>
                </div>
              </div>
            )}

            {/* ── 歷史會議 ── */}
            {pastMeetings.length > 0 && (
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>歷史會議</div>
                {pastMeetings.map(m => (
                  <PastMeetingCard
                    key={m.id}
                    meeting={m}
                    entries={allPastEntries.filter(e => e.meeting_id === m.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}

      </main>
    </div>
  )
}

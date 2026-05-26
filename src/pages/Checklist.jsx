import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// ── 品項列 ──
function ItemRow({ item, onToggle, onDelete }) {
  const [delHover, setDelHover] = useState(false)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
      <div
        onClick={() => onToggle(item)}
        style={{
          width: 22, height: 22, borderRadius: 6, flexShrink: 0,
          border: `2px solid ${item.is_done ? 'var(--blue)' : 'var(--border)'}`,
          background: item.is_done ? 'var(--blue)' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all 0.15s',
        }}
      >
        {item.is_done && <span style={{ color: '#fff', fontSize: 13, lineHeight: 1 }}>✓</span>}
      </div>
      <span style={{
        flex: 1, fontSize: 15,
        color: item.is_done ? 'var(--text-secondary)' : 'var(--text-primary)',
        textDecoration: item.is_done ? 'line-through' : 'none',
        wordBreak: 'break-all',
      }}>{item.content}</span>
      <button
        onClick={() => onDelete(item)}
        onMouseEnter={() => setDelHover(true)}
        onMouseLeave={() => setDelHover(false)}
        style={{
          background: 'none', border: 'none', padding: '2px 4px',
          fontSize: 16, color: delHover ? 'var(--red)' : 'var(--text-secondary)',
          cursor: 'pointer', flexShrink: 0, transition: 'color 0.15s', lineHeight: 1,
        }}
      >🗑️</button>
    </div>
  )
}

// ── 清單卡片 ──
function ChecklistCard({ checklist, items, onAddItem, onToggle, onDelete, onReset }) {
  const [itemInput, setItemInput] = useState('')
  const itemInputRef = useRef(null)

  const doneCount = items.filter(i => i.is_done).length
  const total = items.length
  const allDone = total > 0 && doneCount === total
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0

  function handleAdd() {
    const content = itemInput.trim()
    if (!content) return
    onAddItem(checklist.id, content, items)
    setItemInput('')
    if (itemInputRef.current) itemInputRef.current.focus()
  }

  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 16, padding: '18px 18px 14px', marginBottom: 16,
    }}>
      {/* 清單名稱 */}
      <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>
        {checklist.title}
      </div>

      {/* 進度條 */}
      {total > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: allDone ? 'var(--green)' : 'var(--text-secondary)', marginBottom: 6, fontWeight: allDone ? 600 : 400 }}>
            {allDone ? '✅ 全部確認完成！' : `已確認 ${doneCount} / 共 ${total} 項`}
          </div>
          <div style={{ background: 'var(--border)', borderRadius: 99, height: 8, overflow: 'hidden' }}>
            <div style={{
              background: allDone ? 'var(--green)' : 'var(--blue)',
              height: '100%', width: `${pct}%`, borderRadius: 99,
              transition: 'width 0.3s ease, background 0.3s ease',
            }} />
          </div>
        </div>
      )}

      {/* 品項清單 */}
      {items.length === 0 ? (
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', padding: '12px 0' }}>
          尚未新增品項
        </p>
      ) : (
        <div style={{ marginBottom: 8 }}>
          {items.map(item => (
            <ItemRow key={item.id} item={item} onToggle={onToggle} onDelete={onDelete} />
          ))}
        </div>
      )}

      {/* 新增品項 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
        <input
          ref={itemInputRef}
          value={itemInput}
          onChange={e => setItemInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="新增品項..."
          style={{
            width: '100%', padding: '8px 12px', fontSize: 14,
            border: '1px solid var(--border)', borderRadius: 8,
            background: 'var(--bg)', color: 'var(--text-primary)',
            outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--blue)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
        <button
          onClick={handleAdd}
          style={{
            background: 'var(--blue)', color: '#fff', border: 'none',
            borderRadius: 8, padding: '8px 16px', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', whiteSpace: 'nowrap', alignSelf: 'flex-end',
          }}
        >新增</button>
      </div>

      {/* 重置按鈕 */}
      <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
        <button
          onClick={() => onReset(checklist)}
          style={{
            background: 'var(--bg)', color: 'var(--text-secondary)',
            border: '1px solid var(--border)', borderRadius: 8,
            padding: '7px 16px', fontSize: 13, cursor: 'pointer',
          }}
        >🔄 重置清單</button>
      </div>
    </div>
  )
}

// ── 主頁面 ──
export default function Checklist() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [checklists, setChecklists] = useState([])
  const [allItems, setAllItems] = useState([])
  const [showNewInput, setShowNewInput] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const newTitleRef = useRef(null)

  useEffect(() => { fetchAll() }, [])

  useEffect(() => {
    if (showNewInput && newTitleRef.current) newTitleRef.current.focus()
  }, [showNewInput])

  async function fetchAll() {
    setLoading(true)
    const [{ data: clData }, { data: items }] = await Promise.all([
      supabase.from('checklists').select('*').eq('is_archived', false).order('created_at', { ascending: false }),
      supabase.from('checklist_items').select('*').order('sort_order', { ascending: true }),
    ])
    setChecklists(clData ?? [])
    setAllItems(items ?? [])
    setLoading(false)
  }

  async function handleCreateChecklist() {
    const title = newTitle.trim()
    if (!title) return
    const { data, error } = await supabase
      .from('checklists')
      .insert({ title, is_archived: false })
      .select()
      .single()
    if (!error && data) {
      setChecklists(prev => [data, ...prev])
      setNewTitle('')
      setShowNewInput(false)
    }
  }

  async function handleAddItem(checklistId, content, items) {
    const maxOrder = items.length > 0 ? Math.max(...items.map(i => i.sort_order ?? 0)) : 0
    const { data, error } = await supabase
      .from('checklist_items')
      .insert({ checklist_id: checklistId, content, is_done: false, sort_order: maxOrder + 1 })
      .select()
      .single()
    if (!error && data) setAllItems(prev => [...prev, data])
  }

  async function handleToggleItem(item) {
    const update = item.is_done
      ? { is_done: false, done_at: null }
      : { is_done: true, done_at: new Date().toISOString() }
    const { error } = await supabase.from('checklist_items').update(update).eq('id', item.id)
    if (!error) setAllItems(prev => prev.map(i => i.id === item.id ? { ...i, ...update } : i))
  }

  async function handleDeleteItem(item) {
    if (!window.confirm(`確定要刪除「${item.content}」嗎？`)) return
    const { error } = await supabase.from('checklist_items').delete().eq('id', item.id)
    if (!error) setAllItems(prev => prev.filter(i => i.id !== item.id))
  }

  async function handleReset(checklist) {
    if (!window.confirm('確定要清除所有已完成的勾選嗎？品項不會刪除，只會取消打勾。')) return
    const { error } = await supabase
      .from('checklist_items')
      .update({ is_done: false, done_at: null })
      .eq('checklist_id', checklist.id)
      .eq('is_done', true)
    if (!error) {
      setAllItems(prev => prev.map(i =>
        i.checklist_id === checklist.id ? { ...i, is_done: false, done_at: null } : i
      ))
    }
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
        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', flex: 1 }}>展覽清點表</span>
        <button
          onClick={() => setShowNewInput(v => !v)}
          style={{
            background: 'var(--blue)', color: '#fff', border: 'none',
            borderRadius: 10, padding: '7px 14px', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', whiteSpace: 'nowrap',
          }}
        >＋ 建立新清單</button>
      </header>

      <main style={{ padding: '20px 16px', maxWidth: 600, margin: '0 auto' }}>

        {loading && (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 48 }}>載入中...</p>
        )}

        {!loading && (
          <>
            {/* 建立新清單輸入框 */}
            {showNewInput && (
              <div className="slide-in-top" style={{
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: 14, padding: 16, marginBottom: 20,
                display: 'flex', gap: 10,
              }}>
                <input
                  ref={newTitleRef}
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleCreateChecklist(); if (e.key === 'Escape') setShowNewInput(false) }}
                  placeholder="輸入清單名稱（例：2026寵物展清點）"
                  style={{
                    flex: 1, padding: '8px 12px', fontSize: 14,
                    border: '1px solid var(--border)', borderRadius: 8,
                    background: 'var(--bg)', color: 'var(--text-primary)',
                    outline: 'none', fontFamily: 'inherit',
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--blue)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
                <button
                  onClick={handleCreateChecklist}
                  style={{
                    background: 'var(--blue)', color: '#fff', border: 'none',
                    borderRadius: 8, padding: '8px 16px', fontSize: 14, fontWeight: 600,
                    cursor: 'pointer', whiteSpace: 'nowrap',
                  }}
                >建立</button>
                <button
                  onClick={() => setShowNewInput(false)}
                  style={{
                    background: 'none', border: '1px solid var(--border)', color: 'var(--text-secondary)',
                    borderRadius: 8, padding: '8px 12px', fontSize: 14, cursor: 'pointer',
                  }}
                >取消</button>
              </div>
            )}

            {/* 清單列表 */}
            {checklists.length === 0 && !showNewInput && (
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '32px 0' }}>
                目前沒有清單，點「＋ 建立新清單」開始
              </p>
            )}
            {checklists.map(cl => (
              <ChecklistCard
                key={cl.id}
                checklist={cl}
                items={allItems.filter(i => i.checklist_id === cl.id)}
                onAddItem={handleAddItem}
                onToggle={handleToggleItem}
                onDelete={handleDeleteItem}
                onReset={handleReset}
              />
            ))}
          </>
        )}

      </main>
    </div>
  )
}

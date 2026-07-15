import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const CATEGORY_ORDER = ['旅遊展', '寵物展', '其他']

// 未來展覽由近到遠排前面，過期展覽排最後
function sortExhibitions(list) {
  const today = new Date().toISOString().slice(0, 10)
  const upcoming = list
    .filter(ex => (ex.end_date || ex.event_date) >= today)
    .sort((a, b) => a.event_date.localeCompare(b.event_date))
  const past = list
    .filter(ex => (ex.end_date || ex.event_date) < today)
    .sort((a, b) => b.event_date.localeCompare(a.event_date))
  return [...upcoming, ...past]
}

function fmtDate(dateStr) {
  if (!dateStr) return ''
  const [, m, d] = dateStr.split('-')
  return `${parseInt(m)}/${parseInt(d)}`
}

const ROLE_STYLE = {
  '工讀': { color: 'var(--blue)',  bg: 'rgba(37,99,235,0.10)',  border: 'var(--blue)'  },
  '業務': { color: 'var(--green)', bg: 'rgba(22,163,74,0.10)',  border: 'var(--green)' },
}

// ── 展覽卡片 ──
function ExhibitionCard({ ex, assignments, onAdd, onDelete, defaultOpen }) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [name, setName]     = useState('')
  const [note, setNote]     = useState('')
  const [role, setRole]     = useState('工讀')
  const [adding, setAdding] = useState(false)

  const today   = new Date().toISOString().slice(0, 10)
  const isPast  = (ex.end_date || ex.event_date) < today

  const dateRange = ex.end_date && ex.end_date !== ex.event_date
    ? `${fmtDate(ex.event_date)} - ${fmtDate(ex.end_date)}`
    : fmtDate(ex.event_date)

  // 人員按角色排序：工讀 → 業務
  const ROLE_ORDER = { '工讀': 0, '業務': 1 }
  const sortedAssignments = [...assignments].sort(
    (a, b) => (ROLE_ORDER[a.role || '工讀'] ?? 0) - (ROLE_ORDER[b.role || '工讀'] ?? 0)
  )

  // 統計標籤文字
  const partCount  = assignments.filter(a => (a.role || '工讀') === '工讀').length
  const salesCount = assignments.filter(a => a.role === '業務').length
  const countParts = []
  if (partCount  > 0) countParts.push(`工讀 ${partCount}`)
  if (salesCount > 0) countParts.push(`業務 ${salesCount}`)
  const countLabel = assignments.length === 0
    ? '已安排 0 人'
    : `已安排 ${assignments.length} 人（${countParts.join('・')}）`

  async function handleAdd() {
    if (!name.trim()) return
    setAdding(true)
    const ok = await onAdd(ex.id, name.trim(), note.trim(), role)
    if (ok) { setName(''); setNote(''); setRole('工讀') }
    setAdding(false)
  }

  const inp = {
    padding: '7px 10px', fontSize: 14,
    border: '1px solid var(--border)', borderRadius: 8,
    background: 'var(--bg)', color: 'var(--text-primary)',
    outline: 'none', fontFamily: 'inherit',
  }

  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 14, overflow: 'hidden', marginBottom: 10,
      opacity: isPast ? 0.6 : 1,
    }}>
      {/* 縮起狀態：名稱、日期、已安排人數 */}
      <div
        onClick={() => setIsOpen(v => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', cursor: 'pointer', userSelect: 'none' }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{ex.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, textDecoration: isPast ? 'line-through' : 'none' }}>{dateRange}</div>
        </div>
        <span style={{
          fontSize: 12, fontWeight: 600, color: 'var(--blue)',
          background: 'rgba(37,99,235,0.10)', border: '1px solid var(--blue)',
          borderRadius: 20, padding: '2px 10px', flexShrink: 0, whiteSpace: 'nowrap',
        }}>
          {countLabel}
        </span>
        <span style={{
          fontSize: 11, color: 'var(--text-secondary)', flexShrink: 0,
          display: 'inline-block', transition: 'transform 0.2s ease',
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
        }}>▼</span>
      </div>

      {/* 展開內容 */}
      <div style={{ display: 'grid', gridTemplateRows: isOpen ? '1fr' : '0fr', transition: 'grid-template-rows 0.2s ease' }}>
        <div style={{ overflow: 'hidden' }}>
          <div style={{ borderTop: '1px solid var(--border)', padding: '12px 16px 16px' }}>

            {/* 人員清單 */}
            {sortedAssignments.length === 0 ? (
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', padding: '10px 0 14px' }}>
                尚未安排任何人員
              </p>
            ) : (
              <div style={{ marginBottom: 14 }}>
                {sortedAssignments.map(a => {
                  const r = a.role || '工讀'
                  const rs = ROLE_STYLE[r] || ROLE_STYLE['工讀']
                  return (
                    <div key={a.id} style={{
                      display: 'flex', alignItems: 'center',
                      padding: '8px 0', borderBottom: '1px solid var(--border)',
                    }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{a.name}</span>
                        {a.note && (
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 8 }}>{a.note}</span>
                        )}
                      </div>
                      <span style={{
                        fontSize: 11, fontWeight: 600, color: rs.color,
                        background: rs.bg, border: `1px solid ${rs.border}`,
                        borderRadius: 20, padding: '2px 8px', marginRight: 8, flexShrink: 0,
                      }}>{r}</span>
                      <button
                        onClick={() => onDelete(a)}
                        style={{ background: 'none', border: 'none', fontSize: 16, color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px 4px', lineHeight: 1 }}
                      >🗑️</button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* 新增區 */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                placeholder="名字"
                maxLength={50}
                style={{ ...inp, flex: '1 1 80px', minWidth: 80 }}
                onFocus={e => e.target.style.borderColor = 'var(--blue)'}
                onBlur={e  => e.target.style.borderColor = 'var(--border)'}
              />
              <input
                value={note}
                onChange={e => setNote(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                placeholder="備注（選填）"
                maxLength={100}
                style={{ ...inp, flex: '2 1 120px', minWidth: 100 }}
                onFocus={e => e.target.style.borderColor = 'var(--blue)'}
                onBlur={e  => e.target.style.borderColor = 'var(--border)'}
              />
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                style={{ ...inp, flex: '0 0 auto' }}
              >
                <option value="工讀">工讀</option>
                <option value="業務">業務</option>
              </select>
              <button
                onClick={handleAdd}
                disabled={adding || !name.trim()}
                style={{
                  background: 'var(--blue)', color: '#fff',
                  border: 'none', borderRadius: 8,
                  padding: '7px 16px', fontSize: 14, fontWeight: 600,
                  cursor: adding || !name.trim() ? 'not-allowed' : 'pointer',
                  opacity: adding || !name.trim() ? 0.6 : 1,
                  whiteSpace: 'nowrap',
                }}
              >新增</button>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

// ── 類型區塊（預設展開）──
function CategorySection({ category, exhibitions, assignments, onAdd, onDelete }) {
  const [open, setOpen] = useState(true)
  // 每個類型各自展開最近那場（排序後第一筆）
  const nearestId = exhibitions.length > 0 ? exhibitions[0].id : null

  return (
    <div style={{ marginBottom: 24 }}>
      <div
        onClick={() => setOpen(v => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 4px', cursor: 'pointer', userSelect: 'none', marginBottom: 8 }}
      >
        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', flex: 1 }}>
          {category}（{exhibitions.length}場）
        </span>
        <span style={{
          fontSize: 11, color: 'var(--text-secondary)',
          display: 'inline-block', transition: 'transform 0.2s',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
        }}>▼</span>
      </div>

      <div style={{ display: 'grid', gridTemplateRows: open ? '1fr' : '0fr', transition: 'grid-template-rows 0.2s ease' }}>
        <div style={{ overflow: 'hidden' }}>
          {exhibitions.map(ex => (
            <ExhibitionCard
              key={ex.id}
              ex={ex}
              assignments={assignments.filter(a => a.exhibition_id === ex.id)}
              onAdd={onAdd}
              onDelete={onDelete}
              defaultOpen={ex.id === nearestId}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── 主頁面 ──
export default function Staffing() {
  const navigate = useNavigate()
  const [exhibitions,  setExhibitions]  = useState([])
  const [assignments,  setAssignments]  = useState([])
  const [loading,      setLoading]      = useState(true)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: exData }, { data: asData }] = await Promise.all([
      supabase.from('exhibitions').select('*'),
      supabase.from('staff_assignments').select('*').order('created_at', { ascending: true }),
    ])
    setExhibitions(sortExhibitions(exData ?? []))
    setAssignments(asData ?? [])
    setLoading(false)
  }

  async function handleAdd(exhibitionId, name, note, role) {
    const { data, error } = await supabase
      .from('staff_assignments')
      .insert({ exhibition_id: exhibitionId, name, note: note || null, role: role || '工讀', sort_order: 0 })
      .select().single()
    if (error) { alert('操作失敗，請重試'); return false }
    setAssignments(prev => [...prev, data])
    return true
  }

  async function handleDelete(assignment) {
    if (!window.confirm(`確定要刪除「${assignment.name}」嗎？`)) return
    const { error } = await supabase.from('staff_assignments').delete().eq('id', assignment.id)
    if (error) { alert('操作失敗，請重試'); return }
    setAssignments(prev => prev.filter(a => a.id !== assignment.id))
  }

  // 依類型分組（無 category 歸入「其他」）
  const byCategory = {}
  CATEGORY_ORDER.forEach(cat => { byCategory[cat] = [] })
  exhibitions.forEach(ex => {
    const cat = CATEGORY_ORDER.includes(ex.category) ? ex.category : '其他'
    byCategory[cat].push(ex)
  })

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
        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>人力安排</span>
      </header>

      <main style={{ padding: '20px 16px', maxWidth: 640, margin: '0 auto' }}>

        {loading && (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 48 }}>載入中...</p>
        )}

        {!loading && exhibitions.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 48 }}>目前沒有展覽資料</p>
        )}

        {!loading && exhibitions.length > 0 && CATEGORY_ORDER.map(cat =>
          byCategory[cat].length > 0 ? (
            <CategorySection
              key={cat}
              category={cat}
              exhibitions={byCategory[cat]}
              assignments={assignments}
              onAdd={handleAdd}
              onDelete={handleDelete}
            />
          ) : null
        )}

      </main>
    </div>
  )
}

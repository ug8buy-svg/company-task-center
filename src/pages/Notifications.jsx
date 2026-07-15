import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const CATEGORIES = ['旅遊展', '寵物展']
const COMPANIES  = ['上聯', '展昭', '威典', '生動', '其他']

const inputStyle = {
  width: '100%', padding: '9px 12px', fontSize: 14,
  border: '1px solid var(--border)', borderRadius: 8,
  background: 'var(--bg)', color: 'var(--text-primary)',
  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
}

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

function formatDateRange(ex) {
  const start = ex.event_date
  const end   = ex.end_date || ex.event_date
  const days  = Math.round((new Date(end) - new Date(start)) / 86400000) + 1
  if (start === end) return `${start.replace(/-/g, '/')}（共1天）`
  return `${start.replace(/-/g, '/')} ～ ${end.replace(/-/g, '/')}（共${days}天）`
}

function fmtShort(dateStr) {
  if (!dateStr) return ''
  const [, m, d] = dateStr.split('-')
  return `${parseInt(m)}/${parseInt(d)}`
}

function detectCollisions(exhibitions) {
  const pairs = []
  for (let i = 0; i < exhibitions.length; i++) {
    for (let j = i + 1; j < exhibitions.length; j++) {
      const a = exhibitions[i]
      const b = exhibitions[j]
      const startA = a.event_date
      const endA   = a.end_date || a.event_date
      const startB = b.event_date
      const endB   = b.end_date || b.event_date
      if (startA <= endB && endA >= startB) {
        pairs.push({ a, b })
      }
    }
  }
  return pairs
}

// ── 展覽卡片 ──
function ExhibitionCard({ ex, onDelete }) {
  return (
    <div style={{
      background: 'var(--bg)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '12px 14px', marginBottom: 8,
      display: 'flex', alignItems: 'flex-start', gap: 12,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
          {ex.name}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          {formatDateRange(ex)}
        </div>
      </div>
      <button
        onClick={() => onDelete(ex)}
        style={{ background: 'none', border: 'none', fontSize: 18, color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px 4px', flexShrink: 0, lineHeight: 1 }}
      >🗑️</button>
    </div>
  )
}

// ── 年份區塊 ──
function YearSection({ year, exList, isNewest, onDelete }) {
  const [open, setOpen] = useState(isNewest)
  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', background: 'none', border: 'none',
          padding: '8px 4px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{open ? '▾' : '▸'}</span>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>
          {year}年（{exList.length}場）
        </span>
      </button>
      {open && (
        <div style={{ paddingLeft: 4 }}>
          {exList.map(ex => <ExhibitionCard key={ex.id} ex={ex} onDelete={onDelete} />)}
        </div>
      )}
    </div>
  )
}

// ── 類型區塊 ──
function CategorySection({ category, exList, onDelete }) {
  const [open, setOpen] = useState(true)
  const yearMap = {}
  exList.forEach(ex => {
    const yr = ex.event_date.slice(0, 4)
    if (!yearMap[yr]) yearMap[yr] = []
    yearMap[yr].push(ex)
  })
  const years = Object.keys(yearMap).sort((a, b) => b - a)
  const newestYear = years[0]

  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 14, marginBottom: 12, overflow: 'hidden',
    }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', background: 'none', border: 'none',
          padding: '14px 16px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 15, color: 'var(--text-secondary)' }}>{open ? '▾' : '▸'}</span>
        <span style={{ flex: 1, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
          {category}
        </span>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          {exList.length}場
        </span>
      </button>
      {open && (
        <div style={{ padding: '0 16px 14px' }}>
          {years.map(yr => (
            <YearSection
              key={yr}
              year={yr}
              exList={yearMap[yr]}
              isNewest={yr === newestYear}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── 主頁面 ──
export default function Notifications() {
  const navigate = useNavigate()
  const [exhibitions, setExhibitions] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [showForm,    setShowForm]    = useState(false)
  const [form, setForm] = useState({
    company: '上聯', companyCustom: '', location: '',
    event_date: '', end_date: '', category: '旅遊展',
  })
  const [formError, setFormError] = useState('')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const { data } = await supabase.from('exhibitions').select('*')
    setExhibitions(sortExhibitions(data ?? []))
    setLoading(false)
  }

  async function handleAdd() {
    const companyName = form.company === '其他' ? form.companyCustom.trim() : form.company
    if (!form.location.trim()) { setFormError('請輸入展覽地點'); return }
    if (!companyName)          { setFormError('請輸入展覽公司名稱'); return }
    if (!form.event_date)      { setFormError('請選擇開始日期'); return }
    if (form.end_date && form.end_date < form.event_date) { setFormError('結束日期不可早於開始日期'); return }

    const name = `${form.location.trim()}（${companyName}）`

    const { data, error } = await supabase
      .from('exhibitions')
      .insert({
        name,
        company: companyName,
        location: form.location.trim(),
        event_date: form.event_date,
        end_date: form.end_date || null,
        category: form.category,
      })
      .select()
      .single()

    if (error) { alert('操作失敗，請重試'); return }
    setExhibitions(prev => sortExhibitions([data, ...prev]))
    setForm({ company: '上聯', companyCustom: '', location: '', event_date: '', end_date: '', category: '旅遊展' })
    setShowForm(false)
    setFormError('')
  }

  async function handleDelete(ex) {
    if (!window.confirm(`確定要刪除「${ex.name}」嗎？`)) return
    const { error } = await supabase.from('exhibitions').delete().eq('id', ex.id)
    if (error) { alert('操作失敗，請重試'); return }
    setExhibitions(prev => prev.filter(e => e.id !== ex.id))
  }

  const collisions = detectCollisions(exhibitions)

  const byCategory = {}
  CATEGORIES.forEach(cat => { byCategory[cat] = [] })
  exhibitions.forEach(ex => {
    const cat = ex.category || '旅遊展'
    if (!byCategory[cat]) byCategory[cat] = []
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
        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', flex: 1 }}>展覽管理</span>
        <button
          onClick={() => { setShowForm(v => !v); setFormError('') }}
          style={{ background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 10, padding: '7px 14px', fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
        >＋ 新增展覽</button>
      </header>

      <main style={{ padding: '20px 16px', maxWidth: 600, margin: '0 auto' }}>

        {loading && (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 48 }}>載入中...</p>
        )}

        {!loading && (
          <>
            {/* 撞期警示 */}
            {collisions.length > 0 && (
              <div style={{
                background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.4)',
                borderRadius: 12, padding: '12px 14px', marginBottom: 16,
              }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--red)', marginBottom: 6 }}>
                  ⚠️ 撞期警示
                </div>
                {collisions.map(({ a, b }, idx) => (
                  <div key={idx} style={{ fontSize: 13, color: 'var(--red)', lineHeight: 1.8 }}>
                    {a.name} {fmtShort(a.event_date)}-{fmtShort(a.end_date || a.event_date)} 與 {b.name} {fmtShort(b.event_date)}-{fmtShort(b.end_date || b.event_date)} 日期重疊
                  </div>
                ))}
              </div>
            )}

            {/* 新增表單 */}
            {showForm && (
              <div className="slide-in-top" style={{
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: 14, padding: 16, marginBottom: 20,
                display: 'flex', flexDirection: 'column', gap: 12,
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>展覽類型</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    style={inputStyle}
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>展覽公司 *</label>
                  <select
                    value={form.company}
                    onChange={e => setForm(f => ({ ...f, company: e.target.value, companyCustom: '' }))}
                    style={inputStyle}
                  >
                    {COMPANIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  {form.company === '其他' && (
                    <input
                      value={form.companyCustom}
                      onChange={e => setForm(f => ({ ...f, companyCustom: e.target.value }))}
                      placeholder="請輸入公司名稱"
                      maxLength={50}
                      style={{ ...inputStyle, marginTop: 6 }}
                      onFocus={e => e.target.style.borderColor = 'var(--blue)'}
                      onBlur={e  => e.target.style.borderColor = 'var(--border)'}
                    />
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>展覽地點 *</label>
                  <input
                    value={form.location}
                    onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                    placeholder="例如：高雄展覽館、台北世貿一館"
                    maxLength={100}
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = 'var(--blue)'}
                    onBlur={e  => e.target.style.borderColor = 'var(--border)'}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>開始日期</label>
                  <input
                    type="date" value={form.event_date}
                    onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))}
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = 'var(--blue)'}
                    onBlur={e  => e.target.style.borderColor = 'var(--border)'}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>結束日期</label>
                  <input
                    type="date" value={form.end_date}
                    onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = 'var(--blue)'}
                    onBlur={e  => e.target.style.borderColor = 'var(--border)'}
                  />
                </div>
                {formError && (
                  <p style={{ color: 'var(--red)', fontSize: 13, margin: 0 }}>{formError}</p>
                )}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => { setShowForm(false); setFormError('') }}
                    style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: 8, padding: '8px 14px', fontSize: 14, cursor: 'pointer' }}
                  >取消</button>
                  <button
                    onClick={handleAdd}
                    style={{ background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                  >新增</button>
                </div>
              </div>
            )}

            {/* 空狀態 */}
            {exhibitions.length === 0 && !showForm && (
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '32px 0' }}>
                尚未新增任何展覽
              </p>
            )}

            {/* 展覽清單 */}
            {exhibitions.length > 0 && CATEGORIES.map(cat =>
              byCategory[cat].length > 0 ? (
                <CategorySection
                  key={cat}
                  category={cat}
                  exList={byCategory[cat]}
                  onDelete={handleDelete}
                />
              ) : null
            )}
          </>
        )}
      </main>
    </div>
  )
}

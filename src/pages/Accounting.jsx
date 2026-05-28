import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const CATEGORIES = ['主持薪水', '工讀薪水', '住宿', '雜項']

function fmtMoney(n) {
  return '$' + Math.abs(n).toLocaleString()
}

function fmtDate(dateStr) {
  if (!dateStr) return ''
  const [, m, d] = dateStr.split('-')
  return `${parseInt(m)}/${parseInt(d)}`
}

function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d + n)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

// ── 帳務卡片 ──
function AccountingCard({ record, daily, expenses, onSettle, onDelete }) {
  const [isOpen, setIsOpen] = useState(false)

  const totalCount = daily.reduce((s, d) => s + (d.cash_count || 0) + (d.card_count || 0), 0)
  const totalExp = expenses.reduce((s, e) => s + (e.amount || 0), 0)
  const cashLeft = record.cash_left || 0
  const balance = cashLeft - totalExp
  const settled = record.is_settled
  const endDate = record.start_date ? fmtDate(addDays(record.start_date, 3)) : ''

  const labelColor = settled || balance >= 0 ? 'var(--green)' : 'var(--orange)'
  const labelBg = settled || balance >= 0 ? 'rgba(22,163,74,0.10)' : 'rgba(234,88,12,0.10)'
  const labelText = settled
    ? '已結清'
    : balance >= 0
    ? `+${fmtMoney(balance)}`
    : `未結 ${fmtMoney(balance)}`

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>

      {/* 標題列 */}
      <div
        onClick={() => setIsOpen(v => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px', cursor: 'pointer', userSelect: 'none' }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{record.title}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
            {fmtDate(record.start_date)} - {endDate}
          </div>
        </div>
        <span style={{
          fontSize: 12, fontWeight: 600, color: labelColor, background: labelBg,
          border: `1px solid ${labelColor}`, borderRadius: 20, padding: '2px 10px',
          flexShrink: 0, whiteSpace: 'nowrap',
        }}>{labelText}</span>
        <span style={{
          fontSize: 11, color: 'var(--text-secondary)', flexShrink: 0,
          display: 'inline-block', transition: 'transform 0.2s ease',
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
        }}>▼</span>
        <button
          onClick={e => { e.stopPropagation(); onDelete(record) }}
          style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--text-secondary)', padding: '4px', cursor: 'pointer', flexShrink: 0, lineHeight: 1 }}
        >🗑️</button>
      </div>

      {/* 展開內容 */}
      <div style={{ display: 'grid', gridTemplateRows: isOpen ? '1fr' : '0fr', transition: 'grid-template-rows 0.2s ease' }}>
        <div style={{ overflow: 'hidden' }}>
          <div style={{ borderTop: '1px solid var(--border)', padding: '14px 16px 16px' }}>

            {/* 業績 */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, letterSpacing: 0.5 }}>業績</div>
              {daily.sort((a, b) => a.day_index - b.day_index).map(d => (
                <div key={d.day_index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14, padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{fmtDate(d.date)}</span>
                  <span style={{ color: 'var(--text-primary)' }}>現金 {d.cash_count || 0} 張　刷卡 {d.card_count || 0} 張</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', paddingTop: 8 }}>
                <span>業績合計</span><span>{totalCount} 張</span>
              </div>
            </div>

            {/* 支出 */}
            {expenses.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, letterSpacing: 0.5 }}>支出</div>
                {expenses.map((e, i) => (
                  <div key={e.id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14, padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--text-primary)' }}>
                      {e.category === '雜項' && e.note ? e.note : e.category}
                    </span>
                    <span style={{ color: 'var(--text-primary)' }}>{fmtMoney(e.amount)}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', paddingTop: 8 }}>
                  <span>總支出</span><span>{fmtMoney(totalExp)}</span>
                </div>
              </div>
            )}

            {/* 結算 */}
            <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10, letterSpacing: 0.5 }}>結算</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--text-primary)', marginBottom: 4 }}>
                <span>現金餘額</span><span>{fmtMoney(cashLeft)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 12 }}>
                <span style={{ color: 'var(--text-primary)' }}>結算金額</span>
                <span style={{ fontWeight: 700, color: balance >= 0 ? 'var(--green)' : 'var(--orange)' }}>
                  {balance >= 0 ? `+${fmtMoney(balance)}` : `-${fmtMoney(balance)}`}
                </span>
              </div>

              {!settled && balance < 0 && (
                <div style={{
                  background: 'rgba(234,88,12,0.10)', border: '1px solid var(--orange)',
                  borderRadius: 8, padding: '10px', marginBottom: 10,
                  textAlign: 'center', fontSize: 15, fontWeight: 700, color: 'var(--orange)',
                }}>
                  老闆需匯款 {fmtMoney(balance)}
                </div>
              )}

              {settled ? (
                <div style={{ textAlign: 'center', color: 'var(--green)', fontWeight: 600, fontSize: 14, padding: '4px 0' }}>
                  ✓ 已結清
                  {record.settled_at && (
                    <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-secondary)', marginLeft: 8 }}>
                      {record.settled_at.slice(0, 10).replace(/-/g, '/')} 結清
                    </span>
                  )}
                </div>
              ) : (
                <button
                  onClick={e => { e.stopPropagation(); onSettle(record.id) }}
                  style={{
                    width: '100%', background: 'var(--green)', color: '#fff',
                    border: 'none', borderRadius: 8, padding: '9px', fontSize: 14,
                    fontWeight: 600, cursor: 'pointer',
                  }}
                >標記已結清</button>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

// ── 新增表單 ──
function AccountingForm({ onSave, onCancel }) {
  const today = new Date()
  const [title, setTitle] = useState('')
  const [startDate, setStartDate] = useState('')
  const [cashLeft, setCashLeft] = useState('')
  const [days, setDays] = useState([
    { day_index: 1, date: '', cash_count: '', card_count: '' },
    { day_index: 2, date: '', cash_count: '', card_count: '' },
    { day_index: 3, date: '', cash_count: '', card_count: '' },
    { day_index: 4, date: '', cash_count: '', card_count: '' },
  ])
  const [expenses, setExpenses] = useState([])
  const [saving, setSaving] = useState(false)

  const year = startDate ? parseInt(startDate.split('-')[0]) : today.getFullYear()

  function handleStartDateChange(val) {
    setStartDate(val)
    if (!val) {
      setDays(prev => prev.map(d => ({ ...d, date: '' })))
      return
    }
    setDays(prev => prev.map((d, i) => ({ ...d, date: addDays(val, i) })))
  }

  function addExpense() {
    setExpenses(prev => [...prev, { tempId: Date.now() + Math.random(), category: '主持薪水', note: '', amount: '' }])
  }

  function updateExpense(tempId, updated) {
    setExpenses(prev => prev.map(e => e.tempId === tempId ? { ...updated, tempId } : e))
  }

  function removeExpense(tempId) {
    setExpenses(prev => prev.filter(e => e.tempId !== tempId))
  }

  const totalCount = days.reduce((s, d) => s + (parseInt(d.cash_count) || 0) + (parseInt(d.card_count) || 0), 0)
  const totalExp = expenses.reduce((s, e) => s + (parseInt(e.amount) || 0), 0)
  const cashLeftNum = parseInt(cashLeft) || 0
  const balance = cashLeftNum - totalExp

  async function handleSave() {
    if (!title.trim()) { alert('請填入抬頭'); return }
    if (!startDate) { alert('請選擇開始日期'); return }
    setSaving(true)
    try {
      const { data: rec, error: recErr } = await supabase
        .from('accounting_records')
        .insert({ year, title: title.trim(), start_date: startDate, cash_left: cashLeftNum })
        .select().single()
      if (recErr) throw recErr

      const dailyRows = days.map((d, i) => ({
        record_id: rec.id,
        day_index: d.day_index,
        date: d.date || addDays(startDate, i),
        cash_count: parseInt(d.cash_count) || 0,
        card_count: parseInt(d.card_count) || 0,
      }))
      const { data: dailyData, error: dailyErr } = await supabase.from('accounting_daily').insert(dailyRows).select()
      if (dailyErr) throw dailyErr

      const expRows = expenses
        .filter(e => parseInt(e.amount) > 0)
        .map((e, i) => ({
          record_id: rec.id,
          category: e.category,
          note: e.note || null,
          amount: parseInt(e.amount),
          sort_order: i,
        }))
      let expData = []
      if (expRows.length > 0) {
        const { data, error: expErr } = await supabase.from('accounting_expenses').insert(expRows).select()
        if (expErr) throw expErr
        expData = data || []
      }
      onSave(rec, dailyData || [], expData)
    } catch {
      alert('儲存失敗，請重試')
      setSaving(false)
    }
  }

  const inp = {
    padding: '8px 10px', fontSize: 14, border: '1px solid var(--border)', borderRadius: 8,
    background: 'var(--bg)', color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit',
    width: '100%', boxSizing: 'border-box',
  }
  const lbl = { fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5, display: 'block' }

  return (
    <div className="slide-in-top" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, marginBottom: 20 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>新增帳務</div>

      {/* 基本資訊 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
        <div>
          <span style={lbl}>年份</span>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', padding: '6px 0' }}>{year} 年</div>
        </div>
        <div>
          <label style={lbl}>抬頭</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="例：世貿一館（上聯）" maxLength={100} style={inp}
            onFocus={e => e.target.style.borderColor = 'var(--blue)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
        </div>
        <div>
          <label style={lbl}>展覽開始日期</label>
          <input type="date" value={startDate} onChange={e => handleStartDateChange(e.target.value)} style={inp}
            onFocus={e => e.target.style.borderColor = 'var(--blue)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
        </div>
        <div>
          <label style={lbl}>現金餘額（老闆留下的現金）</label>
          <input type="number" value={cashLeft} onChange={e => setCashLeft(e.target.value)} placeholder="0" style={inp}
            onFocus={e => e.target.style.borderColor = 'var(--blue)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
        </div>
      </div>

      {/* 四天業績 */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10 }}>四天業績</div>
        {days.map((d, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '64px 1fr 1fr', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center' }}>
              {d.date ? fmtDate(d.date) : `第${i + 1}天`}
            </span>
            <input
              type="number" value={d.cash_count} placeholder="現金張數"
              onChange={e => setDays(prev => prev.map((dd, j) => j === i ? { ...dd, cash_count: e.target.value } : dd))}
              style={inp}
              onFocus={e => e.target.style.borderColor = 'var(--blue)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
            <input
              type="number" value={d.card_count} placeholder="刷卡張數"
              onChange={e => setDays(prev => prev.map((dd, j) => j === i ? { ...dd, card_count: e.target.value } : dd))}
              style={inp}
              onFocus={e => e.target.style.borderColor = 'var(--blue)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
          </div>
        ))}
      </div>

      {/* 支出明細 */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10 }}>支出明細</div>
        {expenses.map(e => (
          <div key={e.tempId} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <select
              value={e.category}
              onChange={ev => updateExpense(e.tempId, { ...e, category: ev.target.value, note: ev.target.value !== '雜項' ? '' : e.note })}
              style={{ padding: '8px 6px', fontSize: 13, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg)', color: 'var(--text-primary)', outline: 'none', flexShrink: 0 }}
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {e.category === '雜項' && (
              <input value={e.note} onChange={ev => updateExpense(e.tempId, { ...e, note: ev.target.value })}
                placeholder="說明" style={{ ...inp, flex: 1, width: 'auto' }}
                onFocus={ev => ev.target.style.borderColor = 'var(--blue)'} onBlur={ev => ev.target.style.borderColor = 'var(--border)'} />
            )}
            <input type="number" value={e.amount} placeholder="金額"
              onChange={ev => updateExpense(e.tempId, { ...e, amount: ev.target.value })}
              style={{ ...inp, width: e.category === '雜項' ? 90 : 130, flexShrink: 0 }}
              onFocus={ev => ev.target.style.borderColor = 'var(--blue)'} onBlur={ev => ev.target.style.borderColor = 'var(--border)'} />
            <button onClick={() => removeExpense(e.tempId)}
              style={{ background: 'none', border: 'none', fontSize: 16, color: 'var(--text-secondary)', cursor: 'pointer', flexShrink: 0, padding: '0 4px', lineHeight: 1 }}>🗑️</button>
          </div>
        ))}
        <button onClick={addExpense}
          style={{ background: 'none', border: '1px dashed var(--border)', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer', width: '100%', marginTop: 4 }}>
          ＋ 新增支出項目
        </button>
      </div>

      {/* 即時總覽 */}
      <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, letterSpacing: 0.5 }}>總覽</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--text-primary)', marginBottom: 4 }}>
          <span>業績合計</span><span>{totalCount} 張</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--text-primary)', marginBottom: 4 }}>
          <span>總支出</span><span>{fmtMoney(totalExp)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700 }}>
          <span style={{ color: 'var(--text-primary)' }}>結算金額</span>
          <span style={{ color: balance >= 0 ? 'var(--green)' : 'var(--orange)' }}>
            {balance >= 0 ? `+${fmtMoney(balance)}` : `-${fmtMoney(balance)}`}
          </span>
        </div>
      </div>

      {/* 按鈕 */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={handleSave} disabled={saving}
          style={{ flex: 1, background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px', fontSize: 15, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
          {saving ? '儲存中...' : '儲存帳務'}
        </button>
        <button onClick={onCancel}
          style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: 8, padding: '10px 16px', fontSize: 15, cursor: 'pointer' }}>
          取消
        </button>
      </div>
    </div>
  )
}

// ── 主頁面 ──
export default function Accounting() {
  const navigate = useNavigate()
  const [records, setRecords] = useState([])
  const [daily, setDaily] = useState([])
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [expandedYears, setExpandedYears] = useState(new Set())

  useEffect(() => { init() }, [])

  async function init() {
    setLoading(true)
    const [{ data: rData }, { data: dData }, { data: eData }] = await Promise.all([
      supabase.from('accounting_records').select('*').order('start_date', { ascending: false }),
      supabase.from('accounting_daily').select('*').order('day_index'),
      supabase.from('accounting_expenses').select('*').order('sort_order'),
    ])
    const recs = rData ?? []
    setRecords(recs)
    setDaily(dData ?? [])
    setExpenses(eData ?? [])
    const currentYear = new Date().getFullYear()
    const years = [...new Set(recs.map(r => r.year))]
    setExpandedYears(new Set(years.includes(currentYear) ? [currentYear] : years.slice(0, 1)))
    setLoading(false)
  }

  const groupedByYear = records.reduce((acc, r) => {
    if (!acc[r.year]) acc[r.year] = []
    acc[r.year].push(r)
    return acc
  }, {})
  const years = Object.keys(groupedByYear).map(Number).sort((a, b) => b - a)

  function toggleYear(yr) {
    setExpandedYears(prev => {
      const next = new Set(prev)
      if (next.has(yr)) next.delete(yr); else next.add(yr)
      return next
    })
  }

  async function handleSettle(recordId) {
    const settled_at = new Date().toISOString()
    const { error } = await supabase.from('accounting_records').update({ is_settled: true, settled_at }).eq('id', recordId)
    if (error) { alert('操作失敗，請重試'); return }
    setRecords(prev => prev.map(r => r.id === recordId ? { ...r, is_settled: true, settled_at } : r))
  }

  async function handleDelete(record) {
    if (!window.confirm(`確定要刪除「${record.title}」嗎？所有明細也會一起刪除。`)) return
    const { error } = await supabase.from('accounting_records').delete().eq('id', record.id)
    if (error) { alert('操作失敗，請重試'); return }
    setRecords(prev => prev.filter(r => r.id !== record.id))
    setDaily(prev => prev.filter(d => d.record_id !== record.id))
    setExpenses(prev => prev.filter(e => e.record_id !== record.id))
  }

  function handleSave(rec, newDaily, newExpenses) {
    setRecords(prev => {
      const updated = [rec, ...prev]
      return updated.sort((a, b) => b.start_date.localeCompare(a.start_date))
    })
    setDaily(prev => [...prev, ...newDaily])
    setExpenses(prev => [...prev, ...newExpenses])
    setExpandedYears(prev => new Set([...prev, rec.year]))
    setShowForm(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      <header style={{
        background: 'var(--card)', borderBottom: '1px solid var(--border)',
        height: 56, padding: '0 20px',
        display: 'flex', alignItems: 'center', gap: 12,
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button onClick={() => navigate('/')}
          style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--text-secondary)', padding: '4px 8px', borderRadius: 8, lineHeight: 1, cursor: 'pointer' }}>←</button>
        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', flex: 1 }}>劉姐旅展帳務</span>
        <button onClick={() => setShowForm(v => !v)}
          style={{ background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 10, padding: '7px 14px', fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          ＋ 新增帳務
        </button>
      </header>

      <main style={{ padding: '20px 16px', maxWidth: 680, margin: '0 auto' }}>

        {showForm && <AccountingForm onSave={handleSave} onCancel={() => setShowForm(false)} />}

        {loading && <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 48 }}>載入中...</p>}

        {!loading && records.length === 0 && !showForm && (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 48 }}>尚未有帳務記錄</p>
        )}

        {!loading && years.map(yr => {
          const yearRecords = groupedByYear[yr]
          const isExpanded = expandedYears.has(yr)
          return (
            <div key={yr} style={{ marginBottom: 24 }}>
              <div onClick={() => toggleYear(yr)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 4px', cursor: 'pointer', userSelect: 'none', marginBottom: 10 }}>
                <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', flex: 1 }}>{yr} 年</span>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{yearRecords.length} 筆</span>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'inline-block', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
              </div>
              <div style={{ display: 'grid', gridTemplateRows: isExpanded ? '1fr' : '0fr', transition: 'grid-template-rows 0.2s ease' }}>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {yearRecords.map(record => (
                      <AccountingCard
                        key={record.id}
                        record={record}
                        daily={daily.filter(d => d.record_id === record.id)}
                        expenses={expenses.filter(e => e.record_id === record.id)}
                        onSettle={handleSettle}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )
        })}

      </main>
    </div>
  )
}

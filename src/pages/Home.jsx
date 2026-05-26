import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const DOT_COLOR = {
  blue:   'var(--blue)',
  orange: 'var(--orange)',
  green:  'var(--green)',
  red:    'var(--red)',
}
const DOT_ORDER = ['blue', 'orange', 'green', 'red']

const WEEKDAYS   = ['日', '一', '二', '三', '四', '五', '六']
const MONTH_NAMES = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月']
const DAY_NAMES   = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六']

const MODULES = [
  { icon: '📋', label: '劉姐待辦清單', desc: '需劉姐確認的事項',    path: '/todos',     pin: true  },
  { icon: '📝', label: '劉姐專屬備注', desc: '僅限劉姐與管理者',    path: '/notes',     pin: true  },
  { icon: '📊', label: '專案進度看板', desc: '三個專案的進度追蹤',  path: '/projects',  pin: true  },
  { icon: '✅', label: '展覽清點表',   desc: '出發當天逐項確認',    path: '/checklist', pin: false },
  { icon: '🗒️', label: '會議記錄',    desc: '三方即時共用記錄',    path: '/meetings',  pin: false },
  { icon: '🔔', label: '展覽通知設定', desc: 'LINE 推播提醒設定',   path: null,         pin: false, soon: true },
]

// 從時間戳取出瀏覽器本地日期字串（解決 UTC 與台灣時區差 8 小時的問題）
function localDateStr(ts) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function fetchMonthEvents(yr, mo) {
  const pad = n => String(n).padStart(2, '0')
  // DATE 欄位用日期字串比較
  const dateStart = `${yr}-${pad(mo + 1)}-01`
  const dateEnd   = mo === 11 ? `${yr + 1}-01-01` : `${yr}-${pad(mo + 2)}-01`
  // TIMESTAMPTZ 欄位用本地午夜的 ISO 時間戳（含時區修正）
  const tsStart = new Date(yr, mo, 1).toISOString()
  const tsEnd   = new Date(yr, mo + 1, 1).toISOString()

  const [
    { data: mData  },
    { data: tData  },
    { data: msData },
    { data: eData  },
  ] = await Promise.all([
    supabase.from('meetings').select('meeting_date, title')
      .gte('meeting_date', dateStart).lt('meeting_date', dateEnd),
    supabase.from('boss_todos').select('created_at')
      .eq('is_done', false).gte('created_at', tsStart).lt('created_at', tsEnd),
    supabase.from('milestones').select('done_at')
      .eq('is_done', true).not('done_at', 'is', null)
      .gte('done_at', tsStart).lt('done_at', tsEnd),
    supabase.from('exhibitions').select('event_date, name')
      .gte('event_date', dateStart).lt('event_date', dateEnd),
  ])

  const dots = {}
  const summ = {}

  const addDot = (ds, color) => {
    if (!dots[ds]) dots[ds] = []
    if (!dots[ds].includes(color)) dots[ds].push(color)
  }
  const ensureSum = (ds) => {
    if (!summ[ds]) summ[ds] = { meetings: [], todos: 0, milestones: 0, exhibitions: [] }
  }

  for (const m of (mData  || [])) {
    addDot(m.meeting_date, 'blue')
    ensureSum(m.meeting_date)
    summ[m.meeting_date].meetings.push(m.title)
  }
  for (const t of (tData  || [])) {
    const ds = localDateStr(t.created_at)
    addDot(ds, 'orange')
    ensureSum(ds)
    summ[ds].todos++
  }
  for (const m of (msData || [])) {
    const ds = localDateStr(m.done_at)
    addDot(ds, 'green')
    ensureSum(ds)
    summ[ds].milestones++
  }
  for (const e of (eData  || [])) {
    addDot(e.event_date, 'red')
    ensureSum(e.event_date)
    summ[e.event_date].exhibitions.push(e.name)
  }

  for (const ds in dots) {
    dots[ds].sort((a, b) => DOT_ORDER.indexOf(a) - DOT_ORDER.indexOf(b))
  }

  return { dots, summ }
}

// ── 行事曆元件 ──
function Calendar({ today }) {
  const [year,     setYear]     = useState(today.getFullYear())
  const [month,    setMonth]    = useState(today.getMonth())
  const [slideKey, setSlideKey] = useState(0)
  const [slideDir, setSlideDir] = useState('')
  const [dots,     setDots]     = useState({})
  const [summ,     setSumm]     = useState({})
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    fetchMonthEvents(year, month).then(({ dots, summ }) => {
      setDots(dots)
      setSumm(summ)
      setSelected(null)
    })
  }, [year, month])

  function goMonth(dir) {
    setSlideDir(dir > 0 ? 'cal-slide-right' : 'cal-slide-left')
    setSlideKey(k => k + 1)
    const next = month + dir
    if (next > 11)  { setMonth(0);  setYear(y => y + 1) }
    else if (next < 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(next)
  }

  const firstDay    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const selData = selected ? summ[selected] : null

  return (
    <>
      <div style={{ background: 'var(--card)', borderRadius: 16, border: '1px solid var(--border)', padding: '16px 12px', width: '100%', maxWidth: 480 }}>
        {/* 月份導覽 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <button onClick={() => goMonth(-1)} style={navBtn}>‹</button>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
            {year}年 {MONTH_NAMES[month]}
          </span>
          <button onClick={() => goMonth(1)} style={navBtn}>›</button>
        </div>

        {/* 星期標頭 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
          {WEEKDAYS.map((d, i) => (
            <div key={d} style={{
              textAlign: 'center', fontSize: 12, fontWeight: 500,
              color: i === 0 ? 'var(--red)' : i === 6 ? 'var(--blue)' : 'var(--text-secondary)',
              padding: '2px 0',
            }}>{d}</div>
          ))}
        </div>

        {/* 日期格子 */}
        <div key={slideKey} className={slideDir}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {cells.map((day, i) => {
            if (!day) return <div key={`e${i}`} style={{ height: 46 }} />
            const mm       = String(month + 1).padStart(2, '0')
            const dd       = String(day).padStart(2, '0')
            const key      = `${year}-${mm}-${dd}`
            const isToday  = day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
            const isSel    = selected === key
            const isSun    = (i % 7) === 0
            const isSat    = (i % 7) === 6
            const dayDots  = dots[key] || []

            return (
              <div
                key={day}
                onClick={() => setSelected(isSel ? null : key)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: 46, justifyContent: 'center', cursor: 'pointer' }}
              >
                <div style={{
                  width: 30, height: 30,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: '50%', fontSize: 13,
                  fontWeight: isToday || isSel ? 700 : 400,
                  background: isToday ? 'var(--blue)' : isSel ? 'var(--border)' : 'transparent',
                  color: isToday ? '#fff' : isSun ? 'var(--red)' : isSat ? 'var(--blue)' : 'var(--text-primary)',
                }}>{day}</div>
                {dayDots.length > 0 && (
                  <div style={{ display: 'flex', gap: 3, marginTop: 2 }}>
                    {dayDots.map((c, di) => (
                      <span key={di} style={{ width: 5, height: 5, borderRadius: '50%', background: DOT_COLOR[c], display: 'block' }} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* 事件摘要卡片 */}
      {selected && (
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 14, padding: '14px 16px', width: '100%', maxWidth: 480,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: selData ? 10 : 0 }}>
            {selected.replace(/-/g, '/')}
          </div>
          {!selData ? (
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>這天沒有事件</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {selData.meetings.map((title, idx) => (
                <div key={idx} style={{ fontSize: 14, color: 'var(--text-primary)' }}>📅 {title}</div>
              ))}
              {selData.todos > 0 && (
                <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>📋 {selData.todos} 筆待辦未完成</div>
              )}
              {selData.milestones > 0 && (
                <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>✅ {selData.milestones} 個里程碑完成</div>
              )}
              {selData.exhibitions.map((name, idx) => (
                <div key={idx} style={{ fontSize: 14, color: 'var(--text-primary)' }}>🎪 {name}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}

const navBtn = {
  background: 'none', border: 'none',
  fontSize: 24, lineHeight: 1,
  color: 'var(--text-secondary)',
  padding: '4px 14px', borderRadius: 8,
}

// ── 首頁 ──
export default function Home() {
  const navigate = useNavigate()
  const today    = new Date()
  const dateStr  = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日　${DAY_NAMES[today.getDay()]}`

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* 頂部標題列 */}
      <header style={{
        background: 'var(--card)',
        borderBottom: '1px solid var(--border)',
        height: 56,
        padding: '0 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: 0.5, color: 'var(--text-primary)' }}>
          公司任務中心
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          {dateStr}
        </span>
      </header>

      <main style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>

        {/* 行事曆 */}
        <Calendar today={today} />

        {/* 功能模組卡片 */}
        <div className="cards-grid">
          {MODULES.map((m, i) => (
            <div
              key={m.label}
              className="card-animate"
              style={{
                animationDelay: `${i * 80}ms`,
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 14,
                padding: '16px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                cursor: m.soon ? 'default' : 'pointer',
                opacity: m.soon ? 0.55 : 1,
                transition: 'box-shadow 0.15s, transform 0.15s',
                position: 'relative',
              }}
              onClick={() => { if (!m.soon) navigate(m.path) }}
              onMouseEnter={e => {
                if (!m.soon) {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.10)'
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <span style={{ fontSize: 26, flexShrink: 0, lineHeight: 1 }}>{m.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{m.label}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{m.desc}</div>
              </div>
              {m.soon && (
                <span style={{
                  fontSize: 11, fontWeight: 600,
                  background: 'var(--border)',
                  color: 'var(--text-secondary)',
                  borderRadius: 6, padding: '3px 8px',
                  flexShrink: 0, whiteSpace: 'nowrap',
                }}>即將推出</span>
              )}
              {m.pin && !m.soon && (
                <span style={{ fontSize: 16, flexShrink: 0 }}>🔒</span>
              )}
            </div>
          ))}
        </div>

        {/* 行事曆圖例 */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', paddingBottom: 24 }}>
          {[
            { color: 'var(--blue)',   label: '會議記錄' },
            { color: 'var(--orange)', label: '待辦事項' },
            { color: 'var(--green)',  label: '里程碑完成' },
            { color: 'var(--red)',    label: '展覽日' },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'block', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
            </div>
          ))}
        </div>

      </main>
    </div>
  )
}

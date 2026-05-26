import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

// ── 假資料：行事曆事件點（真實資料之後再串接）──
const FAKE_EVENTS = {
  '2026-05-05': ['blue'],
  '2026-05-08': ['orange'],
  '2026-05-12': ['blue', 'green'],
  '2026-05-15': ['orange'],
  '2026-05-20': ['red'],
  '2026-05-22': ['blue'],
  '2026-05-28': ['orange', 'green'],
  '2026-06-03': ['blue'],
  '2026-06-10': ['red'],
  '2026-06-15': ['green', 'orange'],
  '2026-06-22': ['blue'],
}

const DOT_COLOR = {
  blue:   'var(--blue)',
  green:  'var(--green)',
  orange: 'var(--orange)',
  red:    'var(--red)',
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']
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

// ── 行事曆元件 ──
function Calendar({ today }) {
  const [year, setYear]   = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [slideKey, setSlideKey] = useState(0)
  const [slideDir, setSlideDir] = useState('')

  function goMonth(dir) {
    setSlideDir(dir > 0 ? 'cal-slide-right' : 'cal-slide-left')
    setSlideKey(k => k + 1)
    const next = month + dir
    if (next > 11) { setMonth(0);  setYear(y => y + 1) }
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

  return (
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
          const mm  = String(month + 1).padStart(2, '0')
          const dd  = String(day).padStart(2, '0')
          const key = `${year}-${mm}-${dd}`
          const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
          const isSun   = (i % 7) === 0
          const isSat   = (i % 7) === 6
          const dots    = FAKE_EVENTS[key] || []

          return (
            <div key={day} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: 46, justifyContent: 'center' }}>
              <div style={{
                width: 30, height: 30,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '50%',
                fontSize: 13,
                fontWeight: isToday ? 700 : 400,
                background: isToday ? 'var(--blue)' : 'transparent',
                color: isToday ? '#fff' : isSun ? 'var(--red)' : isSat ? 'var(--blue)' : 'var(--text-primary)',
              }}>{day}</div>
              {dots.length > 0 && (
                <div style={{ display: 'flex', gap: 3, marginTop: 2 }}>
                  {dots.map((c, di) => (
                    <span key={di} style={{ width: 5, height: 5, borderRadius: '50%', background: DOT_COLOR[c], display: 'block' }} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
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

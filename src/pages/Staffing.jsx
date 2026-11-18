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

function fmtMoney(n) {
  return '$' + Math.abs(n || 0).toLocaleString()
}

// 手機拍照常常是好幾 MB 的原圖，先壓縮再上傳
function compressImage(file, maxDim = 1600, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('讀取圖片失敗'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('圖片格式錯誤'))
      img.onload = () => {
        let { width, height } = img
        if (width > maxDim || height > maxDim) {
          if (width > height) { height = Math.round(height * maxDim / width); width = maxDim }
          else { width = Math.round(width * maxDim / height); height = maxDim }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d').drawImage(img, 0, 0, width, height)
        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('圖片壓縮失敗')), 'image/jpeg', quality)
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

async function uploadHotelPhoto(blob) {
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
  const { error } = await supabase.storage.from('hotel-photos').upload(path, blob, {
    contentType: 'image/jpeg',
    upsert: false,
  })
  if (error) throw error
  const { data } = supabase.storage.from('hotel-photos').getPublicUrl(path)
  return data.publicUrl
}

const ROLE_STYLE = {
  '工讀': { color: 'var(--blue)',  bg: 'rgba(37,99,235,0.10)',  border: 'var(--blue)'  },
  '業務': { color: 'var(--green)', bg: 'rgba(22,163,74,0.10)',  border: 'var(--green)' },
}

// ── 住宿安排 ──
function HotelSection({ exhibitionId, bookings, memberOptions, onAdd, onUpdate, onDelete }) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [hotelName, setHotelName] = useState('')
  const [contact, setContact] = useState('')
  const [price, setPrice] = useState('')
  const [selectedMembers, setSelectedMembers] = useState([])
  const [photoFile, setPhotoFile] = useState(null)
  const [existingPhotoUrl, setExistingPhotoUrl] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState(null)

  function toggleMember(name) {
    setSelectedMembers(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name])
  }

  function handlePhotoSelect(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  function resetForm() {
    setHotelName(''); setContact(''); setPrice(''); setSelectedMembers([])
    setPhotoFile(null); setExistingPhotoUrl(null); setPhotoPreview(null)
    setShowForm(false); setEditingId(null)
  }

  function startEdit(b) {
    setEditingId(b.id)
    setHotelName(b.hotel_name)
    setContact(b.contact || '')
    setPrice(b.price ? String(b.price) : '')
    setSelectedMembers(b.room_members || [])
    setPhotoFile(null)
    setExistingPhotoUrl(b.photo_url || null)
    setPhotoPreview(b.photo_url || null)
    setShowForm(true)
  }

  async function handleSubmit() {
    if (!hotelName.trim()) return
    setSaving(true)
    const payload = {
      hotelName: hotelName.trim(),
      contact: contact.trim(),
      price: parseInt(price) || 0,
      roomMembers: selectedMembers,
      photoFile,
      existingPhotoUrl,
    }
    const ok = editingId ? await onUpdate(editingId, payload) : await onAdd(exhibitionId, payload)
    if (ok) resetForm()
    setSaving(false)
  }

  const totalPrice = bookings.reduce((s, b) => s + (b.price || 0), 0)

  const inp = {
    padding: '7px 10px', fontSize: 14,
    border: '1px solid var(--border)', borderRadius: 8,
    background: 'var(--bg)', color: 'var(--text-primary)',
    outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box',
  }

  return (
    <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', flex: 1 }}>🏨 住宿安排</span>
        {totalPrice > 0 && (
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>共 {fmtMoney(totalPrice)}</span>
        )}
      </div>

      {bookings.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          {bookings.map(b => (
            <div key={b.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 0', borderBottom: '1px solid var(--border)',
            }}>
              {b.photo_url && (
                <img
                  src={b.photo_url} alt="訂房截圖"
                  onClick={() => setLightboxUrl(b.photo_url)}
                  style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)', cursor: 'pointer', flexShrink: 0 }}
                />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{b.hotel_name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {(b.room_members || []).join('、') || '未指定房客'}
                  {b.contact ? `　${b.contact}` : ''}
                </div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', flexShrink: 0 }}>
                {fmtMoney(b.price)}
              </span>
              <button
                onClick={() => startEdit(b)}
                style={{ background: 'none', border: 'none', fontSize: 14, color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px 4px', lineHeight: 1, flexShrink: 0 }}
              >✏️</button>
              <button
                onClick={() => onDelete(b)}
                style={{ background: 'none', border: 'none', fontSize: 15, color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px 4px', lineHeight: 1, flexShrink: 0 }}
              >🗑️</button>
            </div>
          ))}
        </div>
      )}

      {showForm ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {editingId && (
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--blue)' }}>編輯訂房記錄</div>
          )}
          <input value={hotelName} onChange={e => setHotelName(e.target.value)} placeholder="飯店名稱" maxLength={100} style={inp}
            onFocus={e => e.target.style.borderColor = 'var(--blue)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
          <input value={contact} onChange={e => setContact(e.target.value)} placeholder="聯絡資訊（選填，電話/地址）" maxLength={100} style={inp}
            onFocus={e => e.target.style.borderColor = 'var(--blue)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
          <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="房費" style={inp}
            onFocus={e => e.target.style.borderColor = 'var(--blue)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
          {memberOptions.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {memberOptions.map(name => (
                <button
                  key={name}
                  type="button"
                  onClick={() => toggleMember(name)}
                  style={{
                    fontSize: 12, padding: '4px 10px', borderRadius: 20,
                    border: `1px solid ${selectedMembers.includes(name) ? 'var(--blue)' : 'var(--border)'}`,
                    background: selectedMembers.includes(name) ? 'rgba(37,99,235,0.10)' : 'none',
                    color: selectedMembers.includes(name) ? 'var(--blue)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >{name}</button>
              ))}
            </div>
          )}
          <div>
            {photoPreview ? (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img src={photoPreview} alt="訂房截圖預覽"
                  style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} />
                <button type="button" onClick={() => { setPhotoFile(null); setExistingPhotoUrl(null); setPhotoPreview(null) }}
                  style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: 'var(--red)', color: '#fff', border: 'none', fontSize: 11, cursor: 'pointer', lineHeight: 1 }}
                >✕</button>
              </div>
            ) : (
              <label style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                border: '1px dashed var(--border)', borderRadius: 8, padding: '7px 10px',
                fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer',
              }}>
                📷 訂房截圖（選填）
                <input type="file" accept="image/*" onChange={handlePhotoSelect} style={{ display: 'none' }} />
              </label>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleSubmit}
              disabled={saving || !hotelName.trim()}
              style={{
                flex: 1, background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 8,
                padding: '8px', fontSize: 14, fontWeight: 600,
                cursor: saving || !hotelName.trim() ? 'not-allowed' : 'pointer',
                opacity: saving || !hotelName.trim() ? 0.6 : 1,
              }}
            >{saving ? '儲存中...' : editingId ? '更新訂房' : '新增訂房'}</button>
            <button onClick={resetForm}
              style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: 8, padding: '8px 14px', fontSize: 14, cursor: 'pointer' }}
            >取消</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          style={{ background: 'none', border: '1px dashed var(--border)', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer', width: '100%' }}
        >＋ 新增訂房記錄</button>
      )}

      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: 20, boxSizing: 'border-box',
          }}
        >
          <img src={lightboxUrl} alt="訂房截圖" style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 8 }} />
          <button
            onClick={() => setLightboxUrl(null)}
            style={{
              position: 'fixed', top: 16, right: 16,
              background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff',
              width: 36, height: 36, borderRadius: '50%', fontSize: 18, cursor: 'pointer', lineHeight: 1,
            }}
          >✕</button>
        </div>
      )}
    </div>
  )
}

// ── 展覽卡片 ──
function ExhibitionCard({ ex, assignments, onAdd, onDelete, bookings, onAddHotel, onUpdateHotel, onDeleteHotel, defaultOpen }) {
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

            <HotelSection
              exhibitionId={ex.id}
              bookings={bookings}
              memberOptions={[...new Set(sortedAssignments.map(a => a.name))]}
              onAdd={onAddHotel}
              onUpdate={onUpdateHotel}
              onDelete={onDeleteHotel}
            />

          </div>
        </div>
      </div>
    </div>
  )
}

// ── 年份區塊 ──
function YearSection({ year, exhibitions, assignments, onAdd, onDelete, bookings, onAddHotel, onUpdateHotel, onDeleteHotel, isNewest, nearestId }) {
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
          {year}年（{exhibitions.length}場）
        </span>
      </button>
      {open && (
        <div style={{ paddingLeft: 4 }}>
          {exhibitions.map(ex => (
            <ExhibitionCard
              key={ex.id}
              ex={ex}
              assignments={assignments.filter(a => a.exhibition_id === ex.id)}
              onAdd={onAdd}
              onDelete={onDelete}
              bookings={bookings.filter(b => b.exhibition_id === ex.id)}
              onAddHotel={onAddHotel}
              onUpdateHotel={onUpdateHotel}
              onDeleteHotel={onDeleteHotel}
              defaultOpen={ex.id === nearestId}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── 類型區塊（預設展開）──
function CategorySection({ category, exhibitions, assignments, onAdd, onDelete, bookings, onAddHotel, onUpdateHotel, onDeleteHotel }) {
  const [open, setOpen] = useState(true)
  // 每個類型各自展開最近那場（排序後第一筆）
  const nearestId = exhibitions.length > 0 ? exhibitions[0].id : null

  // 依年份分組，由新到舊排列
  const yearMap = {}
  exhibitions.forEach(ex => {
    const yr = ex.event_date.slice(0, 4)
    if (!yearMap[yr]) yearMap[yr] = []
    yearMap[yr].push(ex)
  })
  const years = Object.keys(yearMap).sort((a, b) => b - a)
  const newestYear = years[0]

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
          {years.map(yr => (
            <YearSection
              key={yr}
              year={yr}
              exhibitions={yearMap[yr]}
              assignments={assignments}
              onAdd={onAdd}
              onDelete={onDelete}
              bookings={bookings}
              onAddHotel={onAddHotel}
              onUpdateHotel={onUpdateHotel}
              onDeleteHotel={onDeleteHotel}
              isNewest={yr === newestYear}
              nearestId={nearestId}
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
  const [bookings,     setBookings]     = useState([])
  const [loading,      setLoading]      = useState(true)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: exData }, { data: asData }, { data: hbData }] = await Promise.all([
      supabase.from('exhibitions').select('*'),
      supabase.from('staff_assignments').select('*').order('created_at', { ascending: true }),
      supabase.from('hotel_bookings').select('*').order('created_at', { ascending: true }),
    ])
    setExhibitions(sortExhibitions(exData ?? []))
    setAssignments(asData ?? [])
    setBookings(hbData ?? [])
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

  async function resolveHotelPhotoUrl({ photoFile, existingPhotoUrl }) {
    if (photoFile) {
      const blob = await compressImage(photoFile)
      return await uploadHotelPhoto(blob)
    }
    return existingPhotoUrl || null
  }

  async function handleAddHotel(exhibitionId, { hotelName, contact, price, roomMembers, photoFile, existingPhotoUrl }) {
    try {
      const photoUrl = await resolveHotelPhotoUrl({ photoFile, existingPhotoUrl })
      const { data, error } = await supabase
        .from('hotel_bookings')
        .insert({
          exhibition_id: exhibitionId,
          hotel_name: hotelName,
          contact: contact || null,
          price,
          room_members: roomMembers,
          photo_url: photoUrl,
          sort_order: 0,
        })
        .select().single()
      if (error) throw error
      setBookings(prev => [...prev, data])
      return true
    } catch {
      alert('操作失敗，請重試')
      return false
    }
  }

  async function handleUpdateHotel(bookingId, { hotelName, contact, price, roomMembers, photoFile, existingPhotoUrl }) {
    try {
      const photoUrl = await resolveHotelPhotoUrl({ photoFile, existingPhotoUrl })
      const { data, error } = await supabase
        .from('hotel_bookings')
        .update({
          hotel_name: hotelName,
          contact: contact || null,
          price,
          room_members: roomMembers,
          photo_url: photoUrl,
        })
        .eq('id', bookingId)
        .select().single()
      if (error) throw error
      setBookings(prev => prev.map(b => b.id === bookingId ? data : b))
      return true
    } catch {
      alert('操作失敗，請重試')
      return false
    }
  }

  async function handleDeleteHotel(booking) {
    if (!window.confirm(`確定要刪除「${booking.hotel_name}」的訂房記錄嗎？`)) return
    const { error } = await supabase.from('hotel_bookings').delete().eq('id', booking.id)
    if (error) { alert('操作失敗，請重試'); return }
    setBookings(prev => prev.filter(b => b.id !== booking.id))
  }

  // 依類型分組（無 category 歸入「其他」）
  const byCategory = {}
  CATEGORY_ORDER.forEach(cat => { byCategory[cat] = [] })
  exhibitions.forEach(ex => {
    const cat = CATEGORY_ORDER.includes(ex.category) ? ex.category : '其他'
    byCategory[cat].push(ex)
  })

  // 訂房費用依展覽年份加總，方便跟去年比較
  const yearlyHotelTotals = {}
  bookings.forEach(b => {
    const ex = exhibitions.find(e => e.id === b.exhibition_id)
    if (!ex) return
    const yr = ex.event_date.slice(0, 4)
    yearlyHotelTotals[yr] = (yearlyHotelTotals[yr] || 0) + (b.price || 0)
  })
  const hotelYears = Object.keys(yearlyHotelTotals).sort((a, b) => b - a)

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

        {!loading && hotelYears.length > 0 && (
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14,
            padding: '14px 16px', marginBottom: 20,
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
              🏨 訂房費用總覽
            </div>
            {hotelYears.map((yr, i) => {
              const prevYr = hotelYears[i + 1]
              const diff = prevYr ? yearlyHotelTotals[yr] - yearlyHotelTotals[prevYr] : null
              return (
                <div key={yr} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14,
                  padding: '6px 0', borderBottom: i < hotelYears.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{yr} 年</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {diff !== null && (
                      <span style={{ fontSize: 12, color: diff >= 0 ? 'var(--orange)' : 'var(--green)' }}>
                        {diff >= 0 ? `↑ 較${prevYr}年 +${fmtMoney(diff)}` : `↓ 較${prevYr}年 -${fmtMoney(diff)}`}
                      </span>
                    )}
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{fmtMoney(yearlyHotelTotals[yr])}</span>
                  </span>
                </div>
              )
            })}
          </div>
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
              bookings={bookings}
              onAddHotel={handleAddHotel}
              onUpdateHotel={handleUpdateHotel}
              onDeleteHotel={handleDeleteHotel}
            />
          ) : null
        )}

      </main>
    </div>
  )
}

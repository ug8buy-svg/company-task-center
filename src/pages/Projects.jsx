import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const STATUS_OPTIONS = ['進行中', '等待中', '卡關', '尚未開始', '已完成']

const STATUS_COLOR = {
  '進行中': 'var(--blue)',
  '等待中': 'var(--orange)',
  '卡關':   'var(--red)',
  '尚未開始': 'var(--text-secondary)',
  '已完成': 'var(--green)',
}

const STATUS_BG = {
  '進行中': 'rgba(37,99,235,0.10)',
  '等待中': 'rgba(234,88,12,0.10)',
  '卡關':   'rgba(220,38,38,0.10)',
  '尚未開始': 'rgba(107,114,128,0.10)',
  '已完成': 'rgba(22,163,74,0.10)',
}

const SEED_PROJECTS = ['春旅店官網', '凱鑫旅店官網', '牠喜歡官網', '團購+1開發']

// ── 里程碑列 ──
function MilestoneRow({ item, onToggle, onDelete }) {
  const [hover, setHover] = useState(false)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
      <div
        onClick={() => onToggle(item)}
        style={{ padding: 10, margin: -10, flexShrink: 0, cursor: 'pointer' }}
      >
        <div style={{
          width: 18, height: 18, borderRadius: 4,
          border: `2px solid ${item.is_done ? 'var(--blue)' : 'var(--border)'}`,
          background: item.is_done ? 'var(--blue)' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
        }}>
          {item.is_done && <span style={{ color: '#fff', fontSize: 11, lineHeight: 1 }}>✓</span>}
        </div>
      </div>
      <span style={{
        flex: 1, fontSize: 14,
        color: item.is_done ? 'var(--text-secondary)' : 'var(--text-primary)',
        textDecoration: item.is_done ? 'line-through' : 'none',
        wordBreak: 'break-all',
      }}>{item.content}</span>
      <button
        onClick={() => onDelete(item)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          background: 'none', border: 'none', padding: 10,
          fontSize: 14, color: hover ? 'var(--red)' : 'var(--text-secondary)',
          cursor: 'pointer', flexShrink: 0, transition: 'color 0.15s', lineHeight: 1,
        }}
      >🗑️</button>
    </div>
  )
}

// ── 專案卡片 ──
function ProjectCard({ project, milestones, onStatusChange, onAddMilestone, onToggleMilestone, onDeleteMilestone, onDeleteProject }) {
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [milestoneInput, setMilestoneInput] = useState('')
  const [delHover, setDelHover] = useState(false)
  const statusMenuRef = useRef(null)

  const done = milestones.filter(m => m.is_done)
  const undone = milestones.filter(m => !m.is_done)
  const total = milestones.length
  const doneCount = done.length
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0

  const isDone = project.status === '已完成'
  const cardBg = isDone ? 'rgba(107,114,128,0.08)' : 'var(--card)'

  useEffect(() => {
    if (!showStatusMenu) return
    function handler(e) {
      if (statusMenuRef.current && !statusMenuRef.current.contains(e.target)) setShowStatusMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showStatusMenu])

  function handleAddMilestone() {
    const text = milestoneInput.trim()
    if (!text) return
    onAddMilestone(project.id, text, milestones)
    setMilestoneInput('')
  }

  return (
    <div style={{
      background: cardBg,
      border: '1px solid var(--border)',
      borderRadius: 16,
      padding: '18px 18px 14px',
      position: 'relative',
      opacity: isDone ? 0.85 : 1,
    }}>
      {/* 右上角刪除 */}
      <button
        onClick={() => onDeleteProject(project)}
        onMouseEnter={() => setDelHover(true)}
        onMouseLeave={() => setDelHover(false)}
        style={{
          position: 'absolute', top: 12, right: 12,
          background: 'none', border: 'none', fontSize: 16,
          color: delHover ? 'var(--red)' : 'var(--text-secondary)',
          padding: '4px 6px', borderRadius: 6, lineHeight: 1,
          cursor: 'pointer', transition: 'color 0.15s',
        }}
      >🗑️</button>

      {/* 專案名稱 */}
      <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10, paddingRight: 32 }}>
        {project.name}
      </div>

      {/* 狀態標籤 */}
      <div style={{ position: 'relative', display: 'inline-block', marginBottom: 12 }} ref={statusMenuRef}>
        <button
          onClick={() => setShowStatusMenu(v => !v)}
          style={{
            background: STATUS_BG[project.status] || 'rgba(107,114,128,0.10)',
            color: STATUS_COLOR[project.status] || 'var(--text-secondary)',
            border: `1px solid ${STATUS_COLOR[project.status] || 'var(--text-secondary)'}`,
            borderRadius: 20, padding: '3px 12px', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', transition: 'all 0.15s',
          }}
        >{project.status}</button>
        {showStatusMenu && (
          <div style={{
            position: 'absolute', top: '110%', left: 0, zIndex: 20,
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '4px 0', minWidth: 110,
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          }}>
            {STATUS_OPTIONS.map(s => (
              <button
                key={s}
                onClick={() => { onStatusChange(project.id, s); setShowStatusMenu(false) }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  background: project.status === s ? STATUS_BG[s] : 'none',
                  border: 'none', padding: '8px 14px', fontSize: 14,
                  color: STATUS_COLOR[s] || 'var(--text-primary)',
                  cursor: 'pointer', fontWeight: project.status === s ? 600 : 400,
                }}
              >{s}</button>
            ))}
          </div>
        )}
      </div>

      {/* 里程碑 */}
      {total > 0 && (
        <div style={{ marginBottom: 12 }}>
          {undone.map(m => (
            <MilestoneRow key={m.id} item={m} onToggle={onToggleMilestone} onDelete={onDeleteMilestone} />
          ))}
          {done.map(m => (
            <MilestoneRow key={m.id} item={m} onToggle={onToggleMilestone} onDelete={onDeleteMilestone} />
          ))}
        </div>
      )}

      {/* 進度條 */}
      {total > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
            {doneCount} / {total} 完成
          </div>
          <div style={{ background: 'var(--border)', borderRadius: 99, height: 8, overflow: 'hidden' }}>
            <div style={{
              background: 'var(--blue)', height: '100%',
              width: `${pct}%`, borderRadius: 99,
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>
      )}

      {/* 新增里程碑 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
        <input
          value={milestoneInput}
          onChange={e => setMilestoneInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAddMilestone()}
          placeholder="新增里程碑..."
          maxLength={200}
          style={{
            width: '100%', padding: '6px 10px', fontSize: 13,
            border: '1px solid var(--border)', borderRadius: 8,
            background: 'var(--bg)', color: 'var(--text-primary)',
            outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--blue)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
        <button
          onClick={handleAddMilestone}
          style={{
            background: 'var(--blue)', color: '#fff', border: 'none',
            borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', whiteSpace: 'nowrap', alignSelf: 'flex-end',
          }}
        >新增</button>
      </div>
    </div>
  )
}

// ── 主頁面 ──
export default function Projects() {
  const navigate = useNavigate()
  const [projects,   setProjects]   = useState([])
  const [milestones, setMilestones] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [showAddProject, setShowAddProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const addInputRef = useRef(null)

  useEffect(() => { init() }, [])

  useEffect(() => {
    if (showAddProject && addInputRef.current) addInputRef.current.focus()
  }, [showAddProject])

  async function init() {
    setLoading(true)
    const { data: pData } = await supabase.from('projects').select('*').order('created_at', { ascending: true })
    const projects = pData ?? []

    if (projects.length === 0) {
      const seeds = SEED_PROJECTS.map(name => ({ name, status: '尚未開始' }))
      const { data: inserted } = await supabase.from('projects').insert(seeds).select()
      setProjects(inserted ?? [])
    } else {
      setProjects(projects)
    }

    const { data: mData } = await supabase.from('milestones').select('*').order('sort_order', { ascending: true })
    setMilestones(mData ?? [])
    setLoading(false)
  }

  function sortedProjects() {
    const active = projects.filter(p => p.status !== '已完成')
    const done   = projects.filter(p => p.status === '已完成')
    return [...active, ...done]
  }

  function milestonesFor(projectId) {
    return milestones.filter(m => m.project_id === projectId)
  }

  async function handleAddProject() {
    const name = newProjectName.trim()
    if (!name) return
    const { data, error } = await supabase
      .from('projects')
      .insert({ name, status: '尚未開始' })
      .select()
      .single()
    if (error) { alert('操作失敗，請重試'); return }
    setProjects(prev => [...prev, data])
    setNewProjectName('')
    setShowAddProject(false)
  }

  async function handleStatusChange(projectId, status) {
    const { error } = await supabase.from('projects').update({ status }).eq('id', projectId)
    if (error) { alert('操作失敗，請重試'); return }
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status } : p))
  }

  async function handleAddMilestone(projectId, content, existing) {
    const maxOrder = existing.length > 0 ? Math.max(...existing.map(m => m.sort_order ?? 0)) : 0
    const { data, error } = await supabase
      .from('milestones')
      .insert({ project_id: projectId, content, is_done: false, sort_order: maxOrder + 1 })
      .select()
      .single()
    if (error) { alert('操作失敗，請重試'); return }
    setMilestones(prev => [...prev, data])
  }

  async function handleToggleMilestone(item) {
    const update = item.is_done
      ? { is_done: false, done_at: null }
      : { is_done: true, done_at: new Date().toISOString() }
    const { error } = await supabase.from('milestones').update(update).eq('id', item.id)
    if (error) { alert('操作失敗，請重試'); return }
    setMilestones(prev => prev.map(m => m.id === item.id ? { ...m, ...update } : m))
  }

  async function handleDeleteMilestone(item) {
    if (!window.confirm(`確定要刪除「${item.content}」嗎？`)) return
    const { error } = await supabase.from('milestones').delete().eq('id', item.id)
    if (error) { alert('操作失敗，請重試'); return }
    setMilestones(prev => prev.filter(m => m.id !== item.id))
  }

  async function handleDeleteProject(project) {
    if (!window.confirm(`確定要刪除「${project.name}」嗎？底下的里程碑也會一起刪除。`)) return
    const { error } = await supabase.from('projects').delete().eq('id', project.id)
    if (error) { alert('操作失敗，請重試'); return }
    setProjects(prev => prev.filter(p => p.id !== project.id))
    setMilestones(prev => prev.filter(m => m.project_id !== project.id))
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
        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', flex: 1 }}>專案進度看板</span>
        <button
          onClick={() => setShowAddProject(v => !v)}
          style={{
            background: 'var(--blue)', color: '#fff', border: 'none',
            borderRadius: 10, padding: '7px 14px', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', whiteSpace: 'nowrap',
          }}
        >＋ 新增專案</button>
      </header>

      <main style={{ padding: '20px 16px', maxWidth: 680, margin: '0 auto' }}>

        {/* 新增專案輸入框 */}
        {showAddProject && (
          <div className="slide-in-top" style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 14, padding: 16, marginBottom: 20,
            display: 'flex', gap: 10,
          }}>
            <input
              ref={addInputRef}
              value={newProjectName}
              onChange={e => setNewProjectName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddProject(); if (e.key === 'Escape') setShowAddProject(false) }}
              placeholder="輸入專案名稱..."
              maxLength={100}
              style={{
                flex: 1, padding: '8px 12px', fontSize: 15,
                border: '1px solid var(--border)', borderRadius: 8,
                background: 'var(--bg)', color: 'var(--text-primary)',
                outline: 'none', fontFamily: 'inherit',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--blue)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
            <button
              onClick={handleAddProject}
              style={{
                background: 'var(--blue)', color: '#fff', border: 'none',
                borderRadius: 8, padding: '8px 18px', fontSize: 15, fontWeight: 600,
                cursor: 'pointer',
              }}
            >新增</button>
            <button
              onClick={() => setShowAddProject(false)}
              style={{
                background: 'none', border: '1px solid var(--border)', color: 'var(--text-secondary)',
                borderRadius: 8, padding: '8px 12px', fontSize: 15, cursor: 'pointer',
              }}
            >取消</button>
          </div>
        )}

        {/* 載入中 */}
        {loading && (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 48 }}>載入中...</p>
        )}

        {/* 專案卡片 */}
        {!loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {sortedProjects().map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                milestones={milestonesFor(project.id)}
                onStatusChange={handleStatusChange}
                onAddMilestone={handleAddMilestone}
                onToggleMilestone={handleToggleMilestone}
                onDeleteMilestone={handleDeleteMilestone}
                onDeleteProject={handleDeleteProject}
              />
            ))}
          </div>
        )}

      </main>
    </div>
  )
}

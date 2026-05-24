import { useState } from 'react'
import { loadHabitDefs, saveHabitDefs } from '../lib/habitDefs'

function genId() {
  return 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

const COLORS = [
  '#3b82f6', '#22c55e', '#a855f7', '#f97316', '#14b8a6',
  '#ec4899', '#f59e0b', '#ef4444', '#6366f1', '#06b6d4',
]

export default function HabitManager({ userId, onClose }) {
  const [defs, setDefsState] = useState(() => loadHabitDefs(userId))

  const [editSecId, setEditSecId] = useState(null)
  const [editSecName, setEditSecName] = useState('')
  const [editSecColor, setEditSecColor] = useState(COLORS[0])

  const [editHabitId, setEditHabitId] = useState(null)
  const [editHabitName, setEditHabitName] = useState('')

  const [confirmId, setConfirmId] = useState(null)

  function setDefs(next) {
    setDefsState(next)
    saveHabitDefs(userId, next)
  }

  function cancelEdit() {
    setEditSecId(null)
    setEditHabitId(null)
    setConfirmId(null)
  }

  // ─── Section ───
  function startAddSec() {
    setEditSecId('new')
    setEditSecName('')
    setEditSecColor(COLORS[0])
    setEditHabitId(null)
    setConfirmId(null)
  }

  function startEditSec(sec) {
    setEditSecId(sec.id)
    setEditSecName(sec.name)
    setEditSecColor(sec.color)
    setEditHabitId(null)
    setConfirmId(null)
  }

  function saveSec() {
    const name = editSecName.trim()
    if (!name) return
    if (editSecId === 'new') {
      setDefs({ ...defs, sections: [...defs.sections, { id: genId(), name, color: editSecColor }] })
    } else {
      setDefs({ ...defs, sections: defs.sections.map(s => s.id === editSecId ? { ...s, name, color: editSecColor } : s) })
    }
    setEditSecId(null)
  }

  function deleteSec(id) {
    setDefs({ sections: defs.sections.filter(s => s.id !== id), habits: defs.habits.filter(h => h.sectionId !== id) })
    setConfirmId(null)
  }

  // ─── Habit ───
  function startAddHabit(sectionId) {
    setEditHabitId('new_' + sectionId)
    setEditHabitName('')
    setEditSecId(null)
    setConfirmId(null)
  }

  function startEditHabit(h) {
    setEditHabitId(h.id)
    setEditHabitName(h.name)
    setEditSecId(null)
    setConfirmId(null)
  }

  function saveHabit(sectionId) {
    const name = editHabitName.trim()
    if (!name) return
    if (editHabitId.startsWith('new_')) {
      setDefs({ ...defs, habits: [...defs.habits, { id: genId(), sectionId, name }] })
    } else {
      setDefs({ ...defs, habits: defs.habits.map(h => h.id === editHabitId ? { ...h, name } : h) })
    }
    setEditHabitId(null)
  }

  function deleteHabit(id) {
    setDefs({ ...defs, habits: defs.habits.filter(h => h.id !== id) })
    setConfirmId(null)
  }

  return (
    <div className="hm-overlay" onClick={onClose}>
      <div className="hm-sheet" onClick={e => e.stopPropagation()}>
        <div className="hm-header">
          <span className="hm-title">루틴 관리</span>
          <button className="day-popup-close" onClick={onClose}>✕</button>
        </div>

        <div className="hm-body">
          {defs.sections.map(sec => {
            const secHabits = defs.habits.filter(h => h.sectionId === sec.id)
            const isEditSec = editSecId === sec.id
            const isNewHabitHere = editHabitId === 'new_' + sec.id
            const isConfSec = confirmId?.type === 'sec' && confirmId.id === sec.id

            return (
              <div key={sec.id} className="hm-section">
                {/* Section header */}
                {isEditSec ? (
                  <div className="hm-edit-row">
                    <div className="hm-color-chips">
                      {COLORS.map(c => (
                        <button key={c} className={`hm-color-chip${editSecColor === c ? ' active' : ''}`}
                          style={{ background: c }} onClick={() => setEditSecColor(c)} />
                      ))}
                    </div>
                    <div className="hm-edit-input-row">
                      <input className="hm-input" value={editSecName}
                        onChange={e => setEditSecName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveSec(); if (e.key === 'Escape') cancelEdit() }}
                        autoFocus placeholder="섹션 이름" />
                      <button className="btn btn-add btn-sm" onClick={saveSec}>저장</button>
                      <button className="btn btn-ghost btn-sm" onClick={cancelEdit}>취소</button>
                    </div>
                  </div>
                ) : isConfSec ? (
                  <div className="hm-confirm-row">
                    <span className="hm-confirm-msg">삭제하면 하위 루틴도 모두 삭제됩니다</span>
                    <button className="btn btn-sm hm-del-btn" onClick={() => deleteSec(sec.id)}>삭제</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setConfirmId(null)}>취소</button>
                  </div>
                ) : (
                  <div className="hm-sec-header">
                    <span className="hm-sec-dot" style={{ background: sec.color }} />
                    <span className="hm-sec-name" style={{ color: sec.color }}>{sec.name}</span>
                    <button className="btn-icon" title="편집" onClick={() => startEditSec(sec)}>✎</button>
                    <button className="btn-icon danger" title="삭제" onClick={() => setConfirmId({ type: 'sec', id: sec.id })}>✕</button>
                  </div>
                )}

                {/* Habits */}
                {secHabits.map(h => {
                  const isEditH = editHabitId === h.id
                  const isConfH = confirmId?.type === 'habit' && confirmId.id === h.id
                  return (
                    <div key={h.id} className="hm-habit-item">
                      {isEditH ? (
                        <div className="hm-edit-input-row" style={{ flex: 1 }}>
                          <input className="hm-input" value={editHabitName}
                            onChange={e => setEditHabitName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') saveHabit(h.sectionId); if (e.key === 'Escape') cancelEdit() }}
                            autoFocus placeholder="루틴 이름" />
                          <button className="btn btn-add btn-sm" onClick={() => saveHabit(h.sectionId)}>저장</button>
                          <button className="btn btn-ghost btn-sm" onClick={cancelEdit}>취소</button>
                        </div>
                      ) : isConfH ? (
                        <div className="hm-confirm-row hm-inline-confirm">
                          <span className="hm-confirm-msg">"{h.name}" 삭제?</span>
                          <button className="btn btn-sm hm-del-btn" onClick={() => deleteHabit(h.id)}>삭제</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => setConfirmId(null)}>취소</button>
                        </div>
                      ) : (
                        <>
                          <span className="hm-habit-dot" style={{ background: sec.color }} />
                          <span className="hm-habit-name">{h.name}</span>
                          <button className="btn-icon" title="편집" onClick={() => startEditHabit(h)}>✎</button>
                          <button className="btn-icon danger" title="삭제" onClick={() => setConfirmId({ type: 'habit', id: h.id })}>✕</button>
                        </>
                      )}
                    </div>
                  )
                })}

                {/* Add habit */}
                {isNewHabitHere ? (
                  <div className="hm-edit-input-row hm-add-habit-input">
                    <input className="hm-input" value={editHabitName}
                      onChange={e => setEditHabitName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveHabit(sec.id); if (e.key === 'Escape') cancelEdit() }}
                      autoFocus placeholder="루틴 이름" />
                    <button className="btn btn-add btn-sm" onClick={() => saveHabit(sec.id)}>저장</button>
                    <button className="btn btn-ghost btn-sm" onClick={cancelEdit}>취소</button>
                  </div>
                ) : (
                  <button className="hm-add-habit-btn" onClick={() => startAddHabit(sec.id)}>
                    + 루틴 추가
                  </button>
                )}
              </div>
            )
          })}

          {/* Add section */}
          {editSecId === 'new' ? (
            <div className="hm-section hm-new-section">
              <div className="hm-edit-row">
                <div className="hm-color-chips">
                  {COLORS.map(c => (
                    <button key={c} className={`hm-color-chip${editSecColor === c ? ' active' : ''}`}
                      style={{ background: c }} onClick={() => setEditSecColor(c)} />
                  ))}
                </div>
                <div className="hm-edit-input-row">
                  <input className="hm-input" value={editSecName}
                    onChange={e => setEditSecName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveSec(); if (e.key === 'Escape') cancelEdit() }}
                    autoFocus placeholder="새 섹션 이름" />
                  <button className="btn btn-add btn-sm" onClick={saveSec}>저장</button>
                  <button className="btn btn-ghost btn-sm" onClick={cancelEdit}>취소</button>
                </div>
              </div>
            </div>
          ) : (
            <button className="hm-add-section-btn" onClick={startAddSec}>
              + 섹션 추가
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

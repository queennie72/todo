import { useState } from 'react'
import { loadHabitDefs, OLD_INDEX_TO_ID } from '../lib/habitDefs'
import { BLOB_EMOJIS, BlobFace } from './BlobEmoji'

function loadLS(key) {
  try { return JSON.parse(localStorage.getItem(key)) } catch { return null }
}
function saveLS(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch {}
}

async function compressImg(file) {
  return new Promise(res => {
    const r = new FileReader()
    r.onload = e => {
      const img = new Image()
      img.onload = () => {
        const MAX = 900
        let { width: w, height: h } = img
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h * MAX / w); w = MAX }
          else { w = Math.round(w * MAX / h); h = MAX }
        }
        const c = document.createElement('canvas')
        c.width = w; c.height = h
        c.getContext('2d').drawImage(img, 0, 0, w, h)
        res(c.toDataURL('image/jpeg', 0.72))
      }
      img.src = e.target.result
    }
    r.readAsDataURL(file)
  })
}

// ── 건강 측정 그래프 ──────────────────────────────────────────
function HealthChart({ userId, year, month, metric }) {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const points = []
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    if (dateStr > todayStr) break
    if (metric === 'bloodsugar') {
      const val = loadLS(`bloodsugar_${userId}_${dateStr}`)
      if (val != null && !isNaN(parseFloat(val))) points.push({ day: d, val: parseFloat(val) })
    } else {
      const ib = loadLS(`inbody_${userId}_${dateStr}`)
      if (!ib) continue
      let val = null
      if (metric === 'weight' && ib.weight) val = parseFloat(ib.weight)
      else if (metric === 'muscle' && ib.muscle) val = parseFloat(ib.muscle)
      else if (metric === 'fat' && ib.fat) val = parseFloat(ib.fat)
      else if (metric === 'fatpct' && ib.fat && ib.weight)
        val = (parseFloat(ib.fat) / parseFloat(ib.weight)) * 100
      if (val != null && !isNaN(val)) points.push({ day: d, val })
    }
  }

  if (points.length === 0) return <div className="chart-empty">이달 데이터가 없습니다</div>

  const W = 320, H = 160
  const PAD = { top: 28, right: 16, bottom: 28, left: 46 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  const vals = points.map(p => p.val)
  let minV = Math.min(...vals), maxV = Math.max(...vals)
  const span = maxV - minV
  if (span < 1) { minV -= 1; maxV += 1 } else { minV -= span * 0.12; maxV += span * 0.12 }
  const finalSpan = maxV - minV

  const cx = d => PAD.left + ((d - 1) / Math.max(daysInMonth - 1, 1)) * innerW
  const cy = v => PAD.top + (1 - (v - minV) / finalSpan) * innerH
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${cx(p.day).toFixed(1)},${cy(p.val).toFixed(1)}`).join(' ')
  const color = metric === 'bloodsugar' ? '#22c55e' : '#3b82f6'
  const yTicks = [minV, (minV + maxV) / 2, maxV]

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'visible' }}>
      {yTicks.map((v, i) => (
        <g key={i}>
          <line x1={PAD.left} y1={cy(v)} x2={W - PAD.right} y2={cy(v)} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4,3" />
          <text x={PAD.left - 5} y={cy(v) + 4} textAnchor="end" fontSize="10" fill="#9ca3af">{v.toFixed(1)}</text>
        </g>
      ))}
      {points.length > 1 && <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
      {points.map(p => (
        <g key={p.day}>
          <circle cx={cx(p.day)} cy={cy(p.val)} r="4.5" fill="#fff" stroke={color} strokeWidth="2.5" />
          <text x={cx(p.day)} y={cy(p.val) - 10} textAnchor="middle" fontSize="10" fill="#374151" fontWeight="600">{p.val.toFixed(1)}</text>
          <text x={cx(p.day)} y={H - PAD.bottom + 16} textAnchor="middle" fontSize="10" fill="#9ca3af">{p.day}</text>
        </g>
      ))}
    </svg>
  )
}

function HealthChartPopup({ userId, year, month, type, onClose }) {
  const [ibMetric, setIbMetric] = useState('weight')
  const activeMetric = type === 'bloodsugar' ? 'bloodsugar' : ibMetric
  const color = type === 'bloodsugar' ? '#22c55e' : '#3b82f6'
  const metricLabel = { weight: '체중 (kg)', muscle: '근육량 (kg)', fat: '체지방 (kg)', fatpct: '체지방률 (%)', bloodsugar: '공복혈당 (mg/dL)' }[activeMetric]

  return (
    <div className="chart-popup-overlay" onClick={onClose}>
      <div className="chart-popup" onClick={e => e.stopPropagation()}>
        <div className="chart-popup-header">
          <span className="chart-popup-title" style={{ color }}>{type === 'bloodsugar' ? '공복혈당 추이' : '인바디 추이'}</span>
          <button className="chart-popup-close" onClick={onClose}>✕</button>
        </div>
        {type === 'inbody' && (
          <div className="metric-subtabs">
            {[{ key: 'weight', label: '체중' }, { key: 'muscle', label: '근육량' }, { key: 'fat', label: '체지방' }, { key: 'fatpct', label: '체지방률' }].map(t => (
              <button key={t.key} className={`metric-subtab${ibMetric === t.key ? ' active' : ''}`} onClick={() => setIbMetric(t.key)}>{t.label}</button>
            ))}
          </div>
        )}
        <div className="chart-metric-label">{year}년 {month + 1}월 · {metricLabel}</div>
        <div className="chart-wrap">
          <HealthChart userId={userId} year={year} month={month} metric={activeMetric} />
        </div>
      </div>
    </div>
  )
}

// ── 날짜 상세 팝업 ────────────────────────────────────────────

function loadHabitStates(userId, dateStr) {
  try {
    const saved = JSON.parse(localStorage.getItem(`habits_${userId}_${dateStr}`))
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) return saved
    if (Array.isArray(saved)) {
      const mapped = {}
      OLD_INDEX_TO_ID.forEach((id, i) => { if (i < saved.length) mapped[id] = !!saved[i] })
      return mapped
    }
  } catch {}
  return {}
}

function DayPopup({ userId, dateStr, onClose }) {
  const [y, m, d] = dateStr.split('-')
  const label = `${y}년 ${Number(m)}월 ${Number(d)}일`

  const [defs] = useState(() => loadHabitDefs(userId))
  const [todos, setTodosState] = useState(() => {
    const saved = loadLS(`todos_${userId}_${dateStr}`)
    return Array.isArray(saved) ? saved : []
  })
  const [habits, setHabitsState] = useState(() => loadHabitStates(userId, dateStr))
  const [emoji, setEmojiState] = useState(() => loadLS(`emoji_${userId}_${dateStr}`) || '')
  const [memo, setMemoState] = useState(() => loadLS(`memo_${userId}_${dateStr}`) || '')
  const [newTodo, setNewTodo] = useState('')

  function setTodos(next) { setTodosState(next); saveLS(`todos_${userId}_${dateStr}`, next) }
  function setHabits(next) { setHabitsState(next); saveLS(`habits_${userId}_${dateStr}`, next) }
  function setEmoji(val) { setEmojiState(val); saveLS(`emoji_${userId}_${dateStr}`, val) }
  function setMemo(val) { setMemoState(val); saveLS(`memo_${userId}_${dateStr}`, val) }

  function addTodo() {
    const text = newTodo.trim()
    if (!text) return
    setTodos([{ id: Date.now(), text, done: false }, ...todos])
    setNewTodo('')
  }

  return (
    <div className="day-popup-overlay" onClick={onClose}>
      <div className="day-popup" onClick={e => e.stopPropagation()}>
        <div className="day-popup-header">
          <span className="day-popup-title">{label}</span>
          <button className="day-popup-close" onClick={onClose}>✕</button>
        </div>

        <div className="day-popup-body">
          {/* 내 할일 */}
          <div className="popup-section">
            <div className="popup-section-title">내 할일</div>
            <div className="popup-add-row">
              <input
                className="popup-add-input"
                value={newTodo}
                onChange={e => setNewTodo(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTodo()}
                placeholder="할일 추가..."
              />
              <button className="btn btn-add popup-add-btn" onClick={addTodo}>+</button>
            </div>
            {todos.length > 0 && (
              <ul className="popup-todo-list">
                {todos.map(t => (
                  <li key={t.id} className={`popup-todo-item${t.done ? ' done' : ''}`}>
                    <button
                      className={`todo-check-btn${t.done ? ' checked' : ''}`}
                      onClick={() => setTodos(todos.map(x => x.id === t.id ? { ...x, done: !x.done } : x))}
                    >
                      {t.done && <svg viewBox="0 0 12 9" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1,5 4,8 11,1" /></svg>}
                    </button>
                    <span className="popup-todo-text">{t.text}</span>
                    <button className="btn-icon danger" onClick={() => setTodos(todos.filter(x => x.id !== t.id))}>✕</button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 루틴 */}
          <div className="popup-section">
            <div className="popup-section-title">오늘의 루틴</div>
            {defs.sections.map(sec => {
              const secHabits = defs.habits.filter(h => h.sectionId === sec.id)
              if (secHabits.length === 0) return null
              return (
                <div key={sec.id} className="popup-habit-group">
                  <span className="popup-habit-label" style={{ color: sec.color }}>{sec.name}</span>
                  <div className="popup-habit-chips">
                    {secHabits.map(h => (
                      <button
                        key={h.id}
                        className={`popup-habit-chip${habits[h.id] ? ' done' : ''}`}
                        style={habits[h.id] ? { borderColor: sec.color, background: sec.color + '20', color: sec.color } : {}}
                        onClick={() => setHabits({ ...habits, [h.id]: !habits[h.id] })}
                      >
                        {habits[h.id] ? '✓ ' : ''}{h.name}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* 감정 */}
          <div className="popup-section">
            <div className="popup-section-title">
              오늘의 감정{emoji && <span style={{marginLeft:6,verticalAlign:'middle'}}><BlobFace id={emoji} size={24}/></span>}
            </div>
            <div className="emoji-grid blob-grid">
              {BLOB_EMOJIS.map(({ id, label: lb }) => (
                <button
                  key={id}
                  className={`emoji-btn blob-btn${emoji === id ? ' selected' : ''}`}
                  onClick={() => setEmoji(emoji === id ? '' : id)}
                  title={lb}
                >
                  <BlobFace id={id} size={40}/>
                  <span className="blob-label">{lb}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 메모 */}
          <div className="popup-section">
            <div className="popup-section-title">하루 메모</div>
            <textarea
              className="day-memo"
              value={memo}
              onChange={e => setMemo(e.target.value)}
              placeholder="오늘 하루를 기록해보세요..."
              rows={3}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

const SECTION_LIGHT = {
  '#3b82f6': '#bfdbfe', '#22c55e': '#bbf7d0', '#a855f7': '#e9d5ff',
  '#f97316': '#fed7aa', '#14b8a6': '#99f6e4', '#ec4899': '#fce7f3',
  '#f59e0b': '#fef3c7', '#ef4444': '#fee2e2', '#6366f1': '#e0e7ff',
  '#06b6d4': '#cffafe',
}

function getHabitStatesObj(userId, dateStr) {
  try {
    const saved = JSON.parse(localStorage.getItem(`habits_${userId}_${dateStr}`))
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) return saved
    if (Array.isArray(saved)) {
      const mapped = {}
      OLD_INDEX_TO_ID.forEach((id, i) => { if (i < saved.length) mapped[id] = !!saved[i] })
      return mapped
    }
  } catch {}
  return {}
}

function getDayPhoto(userId, dateStr) {
  try { return JSON.parse(localStorage.getItem(`photo_${userId}_${dateStr}`)) } catch { return null }
}

function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function buildCells(year, month) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

// ── 사진 달력 ─────────────────────────────────────────────────
function PhotoCalendar({ userId, year, month, cells, todayStr, onSelectDate }) {
  const [photoPopup, setPhotoPopup] = useState(null) // { day, dateStr, photo }
  const [refresh, setRefresh] = useState(0)

  async function handleFileChange(e, dateStr) {
    const file = e.target.files[0]
    if (!file) return
    const compressed = await compressImg(file)
    saveLS(`photo_${userId}_${dateStr}`, compressed)
    setPhotoPopup(p => ({ ...p, photo: compressed }))
    setRefresh(r => r + 1)
    e.target.value = ''
  }

  function deletePhoto(dateStr) {
    localStorage.removeItem(`photo_${userId}_${dateStr}`)
    setPhotoPopup(p => ({ ...p, photo: null }))
    setRefresh(r => r + 1)
  }

  return (
    <div className="review-card">
      <div className="review-card-header">
        <div className="review-card-left">
          <span className="review-color-dot" style={{ background: '#6366f1' }} />
          <div>
            <div className="review-card-title">이달의 사진</div>
            <div className="review-card-habits">날짜 클릭 시 사진 추가/변경</div>
          </div>
        </div>
      </div>

      <div className="photo-cal-grid">
        {WEEKDAYS.map((d, i) => (
          <div key={d} className="review-weekday" style={{ color: i === 0 ? '#ef4444' : i === 6 ? '#3b82f6' : undefined }}>{d}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} className="photo-cal-cell empty" />
          const dateStr = toDateStr(year, month, day)
          const photo = getDayPhoto(userId, dateStr)  // refresh 변수가 있으면 리렌더 시 재호출됨
          void refresh
          const isToday = dateStr === todayStr
          const isFuture = dateStr > todayStr
          return (
            <div
              key={dateStr}
              className={`photo-cal-cell${isToday ? ' today' : ''}${isFuture ? ' future' : ''}${photo ? ' has-photo' : ''}`}
              onClick={() => { if (!isFuture) setPhotoPopup({ day, dateStr, photo: getDayPhoto(userId, dateStr) }) }}
              style={{ cursor: isFuture ? 'default' : 'pointer' }}
              title={isFuture ? '' : photo ? `${month + 1}/${day} 사진 변경` : `${month + 1}/${day} 사진 추가`}
            >
              {photo && <img src={photo} alt={`${day}일`} className="photo-cal-thumb" />}
              <span className="photo-cal-day">{day}</span>
            </div>
          )
        })}
      </div>

      {photoPopup && (
        <div className="photo-lightbox" onClick={() => setPhotoPopup(null)}>
          <div className="photo-lightbox-inner" onClick={e => e.stopPropagation()}>
            <div className="photo-lightbox-header">
              <span>{month + 1}월 {photoPopup.day}일 사진</span>
              <button className="photo-lightbox-close" onClick={() => setPhotoPopup(null)}>✕</button>
            </div>

            {photoPopup.photo ? (
              <>
                <img src={photoPopup.photo} alt="사진" className="photo-lightbox-img" />
                <div className="photo-popup-btns">
                  <label className="btn btn-ghost photo-popup-change-btn">
                    <input type="file" accept="image/*" style={{ display: 'none' }}
                      onChange={e => handleFileChange(e, photoPopup.dateStr)} />
                    사진 변경
                  </label>
                  <button className="btn btn-ghost photo-popup-del-btn"
                    onClick={() => deletePhoto(photoPopup.dateStr)}>
                    사진 삭제
                  </button>
                </div>
              </>
            ) : (
              <label className="photo-popup-upload-label">
                <input type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => handleFileChange(e, photoPopup.dateStr)} />
                <span className="photo-upload-plus">+</span>
                <span>사진 추가</span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>탭하면 갤러리에서 선택</span>
              </label>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── 감정 달력 ─────────────────────────────────────────────────
function MoodCalendar({ userId, year, month, cells, todayStr, onSelectDate }) {
  return (
    <div className="review-card">
      <div className="review-card-header">
        <div className="review-card-left">
          <span className="review-color-dot" style={{ background: '#a855f7' }} />
          <div>
            <div className="review-card-title">이달의 감정</div>
            <div className="review-card-habits">날짜 클릭 시 감정 입력</div>
          </div>
        </div>
      </div>

      <div className="mood-cal-grid">
        {WEEKDAYS.map((d, i) => (
          <div key={d} className="review-weekday" style={{ color: i === 0 ? '#ef4444' : i === 6 ? '#3b82f6' : undefined }}>{d}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} className="mood-cal-cell empty" />
          const dateStr = toDateStr(year, month, day)
          const emojiId = loadLS(`emoji_${userId}_${dateStr}`)
          const isFuture = dateStr > todayStr
          const isToday = dateStr === todayStr
          return (
            <div
              key={dateStr}
              className={`mood-cal-cell${isToday ? ' today' : ''}${isFuture ? ' future' : ''}${emojiId ? ' has-mood' : ''}`}
              onClick={() => { if (!isFuture) onSelectDate(dateStr) }}
              style={{ cursor: isFuture ? 'default' : 'pointer' }}
            >
              {emojiId
                ? <BlobFace id={emojiId} size={36} />
                : <span className="mood-cal-day">{day}</span>
              }
              {emojiId && <span className="mood-cal-day-overlay">{day}</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────
export default function MonthlyReview({ userId, onBack }) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [chartPopup, setChartPopup] = useState(null)
  const [popupDate, setPopupDate] = useState(null)
  const [defs] = useState(() => loadHabitDefs(userId))
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate())

  const cells = buildCells(year, month)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const allDays = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1)
  }

  function getSectionRatio(secHabits, day) {
    if (secHabits.length === 0) return 0
    const dateStr = toDateStr(year, month, day)
    const states = getHabitStatesObj(userId, dateStr)
    return secHabits.filter(h => states[h.id]).length / secHabits.length
  }

  return (
    <main className="container">
      <header>
        <div className="header-left">
          <button className="btn-back" onClick={onBack}>‹</button>
          <h1 className="date-title">한달 리뷰</h1>
        </div>
      </header>

      <div className="review-month-nav">
        <button className="cal-nav-btn" onClick={prevMonth}>‹</button>
        <span className="cal-title">{year}년 {month + 1}월</span>
        <button className="cal-nav-btn" onClick={nextMonth}>›</button>
      </div>

      {/* 사진 달력 */}
      <PhotoCalendar
        userId={userId} year={year} month={month} cells={cells}
        todayStr={todayStr} onSelectDate={setPopupDate}
      />

      {/* 감정 달력 */}
      <MoodCalendar
        userId={userId} year={year} month={month} cells={cells}
        todayStr={todayStr} onSelectDate={setPopupDate}
      />

      {/* 섹션별 루틴 히트맵 */}
      {defs.sections.map(section => {
        const secHabits = defs.habits.filter(h => h.sectionId === section.id)
        const light = SECTION_LIGHT[section.color] || '#f1f5f9'
        const pastDays = allDays.filter(d => toDateStr(year, month, d) <= todayStr)
        const doneDays = pastDays.filter(d => getSectionRatio(secHabits, d) === 1)
        const pct = pastDays.length > 0 ? Math.round((doneDays.length / pastDays.length) * 100) : 0

        return (
          <div key={section.id} className="review-card">
            <div className="review-card-header">
              <div className="review-card-left">
                <span className="review-color-dot" style={{ background: section.color }} />
                <div>
                  <div className="review-card-title">{section.name}</div>
                  <div className="review-card-habits">{secHabits.map(h => h.name).join(' · ')}</div>
                </div>
              </div>
              <div className="review-card-right">
                <span className="review-card-pct" style={{ color: section.color }}>{pct}%</span>
                <span className="review-card-days">{doneDays.length}/{pastDays.length}일 완료</span>
              </div>
            </div>

            <div className="review-mini-cal">
              {WEEKDAYS.map((d, i) => (
                <div key={d} className="review-weekday" style={{ color: i === 0 ? '#ef4444' : i === 6 ? '#3b82f6' : undefined }}>{d}</div>
              ))}
              {cells.map((day, idx) => {
                if (!day) return <div key={`e-${idx}`} className="review-day-cell empty" />
                const dateStr = toDateStr(year, month, day)
                const isFuture = dateStr > todayStr
                const isToday = dateStr === todayStr
                const ratio = getSectionRatio(secHabits, day)
                const bg = isFuture || ratio === 0 ? 'transparent' : ratio === 1 ? section.color : light
                const numColor = (!isFuture && ratio === 1) ? '#fff' : undefined

                return (
                  <div
                    key={dateStr}
                    className={`review-day-cell${isFuture ? ' future' : ''}${isToday ? ' today' : ''}`}
                    style={{
                      background: bg,
                      borderColor: isToday ? section.color : undefined,
                      borderWidth: isToday ? '2px' : undefined,
                      cursor: isFuture ? 'default' : 'pointer',
                    }}
                    onClick={() => !isFuture && setPopupDate(dateStr)}
                    title={isFuture ? '' : `${month + 1}/${day} 입력`}
                  >
                    <span className="review-day-num" style={{ color: numColor }}>{day}</span>
                  </div>
                )
              })}
            </div>

            <div className="review-progress-track">
              <div className="review-progress-fill" style={{ width: `${pct}%`, background: section.color }} />
            </div>

            {section.id === 'sec_health' && (
              <div className="health-chart-btns">
                <button className="health-chart-btn inbody-btn" onClick={() => setChartPopup('inbody')}>📊 인바디 추이</button>
                <button className="health-chart-btn bloodsugar-btn" onClick={() => setChartPopup('bloodsugar')}>📊 공복혈당 추이</button>
              </div>
            )}
          </div>
        )
      })}

      {chartPopup && (
        <HealthChartPopup userId={userId} year={year} month={month} type={chartPopup} onClose={() => setChartPopup(null)} />
      )}

      {popupDate && (
        <DayPopup userId={userId} dateStr={popupDate} onClose={() => setPopupDate(null)} />
      )}
    </main>
  )
}

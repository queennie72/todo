import { useState } from 'react'
import { DAILY_HABITS } from '../hooks/useHabits'

function loadLS(key) {
  try { return JSON.parse(localStorage.getItem(key)) } catch { return null }
}

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

  if (points.length === 0) {
    return <div className="chart-empty">이달 데이터가 없습니다</div>
  }

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
  const decimals = metric === 'fatpct' ? 1 : 1

  const yTicks = [minV, (minV + maxV) / 2, maxV]

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'visible' }}>
      {yTicks.map((v, i) => (
        <g key={i}>
          <line x1={PAD.left} y1={cy(v)} x2={W - PAD.right} y2={cy(v)}
            stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4,3" />
          <text x={PAD.left - 5} y={cy(v) + 4} textAnchor="end" fontSize="10" fill="#9ca3af">
            {v.toFixed(decimals)}
          </text>
        </g>
      ))}
      {points.length > 1 && (
        <path d={pathD} fill="none" stroke={color} strokeWidth="2.5"
          strokeLinejoin="round" strokeLinecap="round" />
      )}
      {points.map(p => (
        <g key={p.day}>
          <circle cx={cx(p.day)} cy={cy(p.val)} r="4.5"
            fill="#fff" stroke={color} strokeWidth="2.5" />
          <text x={cx(p.day)} y={cy(p.val) - 10} textAnchor="middle"
            fontSize="10" fill="#374151" fontWeight="600">
            {p.val.toFixed(decimals)}
          </text>
          <text x={cx(p.day)} y={H - PAD.bottom + 16} textAnchor="middle"
            fontSize="10" fill="#9ca3af">
            {p.day}
          </text>
        </g>
      ))}
    </svg>
  )
}

function HealthMetricsCard({ userId, year, month }) {
  const [mainTab, setMainTab] = useState('inbody')
  const [ibMetric, setIbMetric] = useState('weight')

  const activeMetric = mainTab === 'bloodsugar' ? 'bloodsugar' : ibMetric
  const color = mainTab === 'bloodsugar' ? '#22c55e' : '#3b82f6'

  const metricLabel = {
    weight: '체중 (kg)', muscle: '근육량 (kg)', fat: '체지방 (kg)',
    fatpct: '체지방률 (%)', bloodsugar: '공복혈당 (mg/dL)',
  }[activeMetric]

  return (
    <div className="review-card">
      <div className="review-card-header">
        <div className="review-card-left">
          <span className="review-color-dot" style={{ background: color }} />
          <div>
            <div className="review-card-title">건강 측정 추이</div>
            <div className="review-card-habits">한달간 측정 데이터 그래프</div>
          </div>
        </div>
      </div>

      <div className="metric-tabs">
        {[{ key: 'inbody', label: '인바디 측정', color: '#3b82f6' },
          { key: 'bloodsugar', label: '공복혈당 측정', color: '#22c55e' }].map(t => (
          <button key={t.key}
            className={`metric-tab${mainTab === t.key ? ' active' : ''}`}
            style={mainTab === t.key ? { borderColor: t.color, color: t.color, background: '#f0f9ff' } : {}}
            onClick={() => setMainTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {mainTab === 'inbody' && (
        <div className="metric-subtabs">
          {[{ key: 'weight', label: '체중' }, { key: 'muscle', label: '근육량' },
            { key: 'fat', label: '체지방' }, { key: 'fatpct', label: '체지방률' }].map(t => (
            <button key={t.key}
              className={`metric-subtab${ibMetric === t.key ? ' active' : ''}`}
              onClick={() => setIbMetric(t.key)}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div className="chart-metric-label">{metricLabel}</div>
      <div className="chart-wrap">
        <HealthChart userId={userId} year={year} month={month} metric={activeMetric} />
      </div>
    </div>
  )
}

const SECTIONS = [
  { name: '건강측정', indices: [0, 1], color: '#3b82f6', light: '#bfdbfe' },
  { name: '식단',    indices: [2, 4, 5], color: '#22c55e', light: '#bbf7d0' },
  { name: '생활습관', indices: [3], color: '#a855f7', light: '#e9d5ff' },
  { name: '운동',    indices: [7, 8, 9], color: '#f97316', light: '#fed7aa' },
  { name: '하루정리', indices: [6], color: '#14b8a6', light: '#99f6e4' },
]

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function getHabitStates(userId, dateStr) {
  try {
    const saved = JSON.parse(localStorage.getItem(`habits_${userId}_${dateStr}`))
    if (Array.isArray(saved)) return saved
  } catch {}
  return []
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

function PhotoCalendar({ userId, year, month, cells, todayStr }) {
  const [enlarged, setEnlarged] = useState(null)

  return (
    <div className="review-card">
      <div className="review-card-header">
        <div className="review-card-left">
          <span className="review-color-dot" style={{ background: '#6366f1' }} />
          <div>
            <div className="review-card-title">이달의 사진</div>
            <div className="review-card-habits">날짜별 대표 사진 모아보기</div>
          </div>
        </div>
      </div>

      <div className="photo-cal-grid">
        {WEEKDAYS.map((d, i) => (
          <div
            key={d}
            className="review-weekday"
            style={{ color: i === 0 ? '#ef4444' : i === 6 ? '#3b82f6' : undefined }}
          >
            {d}
          </div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} className="photo-cal-cell empty" />
          const dateStr = toDateStr(year, month, day)
          const photo = getDayPhoto(userId, dateStr)
          const isToday = dateStr === todayStr
          const isFuture = dateStr > todayStr
          return (
            <div
              key={dateStr}
              className={`photo-cal-cell${isToday ? ' today' : ''}${isFuture ? ' future' : ''}${photo ? ' has-photo' : ''}`}
              onClick={() => photo && setEnlarged({ photo, dateStr, day })}
              style={{ cursor: photo ? 'pointer' : 'default' }}
              title={photo ? `${month + 1}/${day} 사진 보기` : `${month + 1}/${day}`}
            >
              {photo && <img src={photo} alt={`${day}일`} className="photo-cal-thumb" />}
              <span className="photo-cal-day">{day}</span>
            </div>
          )
        })}
      </div>

      {enlarged && (
        <div className="photo-lightbox" onClick={() => setEnlarged(null)}>
          <div className="photo-lightbox-inner" onClick={e => e.stopPropagation()}>
            <div className="photo-lightbox-header">
              <span>{month + 1}월 {enlarged.day}일</span>
              <button className="photo-lightbox-close" onClick={() => setEnlarged(null)}>✕</button>
            </div>
            <img src={enlarged.photo} alt="확대 사진" className="photo-lightbox-img" />
          </div>
        </div>
      )}
    </div>
  )
}

export default function MonthlyReview({ userId, onBack }) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate())

  const cells = buildCells(year, month)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const allDays = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  function getSectionRatio(indices, day) {
    const dateStr = toDateStr(year, month, day)
    const states = getHabitStates(userId, dateStr)
    if (states.length === 0) return 0
    const done = indices.filter(i => states[i]).length
    return done / indices.length
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

      {/* 건강 측정 추이 그래프 */}
      <HealthMetricsCard userId={userId} year={year} month={month} />

      {/* 사진 달력 */}
      <PhotoCalendar
        userId={userId}
        year={year}
        month={month}
        cells={cells}
        todayStr={todayStr}
      />

      {/* 5섹션 루틴 히트맵 */}
      {SECTIONS.map(section => {
        const pastDays = allDays.filter(d => toDateStr(year, month, d) <= todayStr)
        const doneDays = pastDays.filter(d => getSectionRatio(section.indices, d) === 1)
        const pct = pastDays.length > 0 ? Math.round((doneDays.length / pastDays.length) * 100) : 0

        return (
          <div key={section.name} className="review-card">
            <div className="review-card-header">
              <div className="review-card-left">
                <span className="review-color-dot" style={{ background: section.color }} />
                <div>
                  <div className="review-card-title">{section.name}</div>
                  <div className="review-card-habits">
                    {section.indices.map(i => DAILY_HABITS[i]).join(' · ')}
                  </div>
                </div>
              </div>
              <div className="review-card-right">
                <span className="review-card-pct" style={{ color: section.color }}>{pct}%</span>
                <span className="review-card-days">{doneDays.length}/{pastDays.length}일 완료</span>
              </div>
            </div>

            <div className="review-mini-cal">
              {WEEKDAYS.map((d, i) => (
                <div
                  key={d}
                  className="review-weekday"
                  style={{ color: i === 0 ? '#ef4444' : i === 6 ? '#3b82f6' : undefined }}
                >
                  {d}
                </div>
              ))}
              {cells.map((day, i) => {
                if (!day) return <div key={`e-${i}`} className="review-day-cell empty" />
                const dateStr = toDateStr(year, month, day)
                const isFuture = dateStr > todayStr
                const isToday = dateStr === todayStr
                const ratio = getSectionRatio(section.indices, day)

                const bg = isFuture || ratio === 0
                  ? 'transparent'
                  : ratio === 1 ? section.color : section.light

                const numColor = (!isFuture && ratio === 1) ? '#fff' : undefined

                return (
                  <div
                    key={dateStr}
                    className={`review-day-cell${isFuture ? ' future' : ''}${isToday ? ' today' : ''}`}
                    style={{
                      background: bg,
                      borderColor: isToday ? section.color : undefined,
                      borderWidth: isToday ? '2px' : undefined,
                    }}
                    title={`${month + 1}/${day} — ${Math.round(ratio * 100)}%`}
                  >
                    <span className="review-day-num" style={{ color: numColor }}>{day}</span>
                  </div>
                )
              })}
            </div>

            <div className="review-progress-track">
              <div className="review-progress-fill" style={{ width: `${pct}%`, background: section.color }} />
            </div>
          </div>
        )
      })}
    </main>
  )
}

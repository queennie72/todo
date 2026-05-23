import { useState } from 'react'
import { DAILY_HABITS } from '../hooks/useHabits'

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

function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export default function MonthlyReview({ userId, onBack }) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate())

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

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

      {SECTIONS.map(section => {
        const allDays = Array.from({ length: daysInMonth }, (_, i) => i + 1)
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
              <div
                className="review-progress-fill"
                style={{ width: `${pct}%`, background: section.color }}
              />
            </div>
          </div>
        )
      })}
    </main>
  )
}

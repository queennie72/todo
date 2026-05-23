import { useState } from 'react'

const DAYS = ['일', '월', '화', '수', '목', '금', '토']

function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export default function Calendar({ userId, onSelectDate }) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate())

  function hasTodos(dateStr) {
    try {
      const data = JSON.parse(localStorage.getItem(`todos_${userId}_${dateStr}`))
      return Array.isArray(data) && data.length > 0
    } catch { return false }
  }

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }

  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []

  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="calendar">
      <div className="cal-nav">
        <button className="cal-nav-btn" onClick={prevMonth}>‹</button>
        <span className="cal-title">{year}년 {month + 1}월</span>
        <button className="cal-nav-btn" onClick={nextMonth}>›</button>
      </div>

      <div className="cal-grid">
        {DAYS.map(d => (
          <div key={d} className="cal-day-label">{d}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} className="cal-cell empty" />
          const dateStr = toDateStr(year, month, day)
          const isToday = dateStr === todayStr
          const hasDot = hasTodos(dateStr)
          return (
            <button
              key={dateStr}
              className={`cal-cell${isToday ? ' today' : ''}`}
              onClick={() => onSelectDate(dateStr)}
            >
              <span className="cal-day-num">{day}</span>
              {hasDot && <span className="cal-dot" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

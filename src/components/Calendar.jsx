import { useState } from 'react'

const DAYS = ['일', '월', '화', '수', '목', '금', '토']

function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

const DEFAULT_TOTAL = 7

function getTodoStats(userId, dateStr) {
  try {
    const data = JSON.parse(localStorage.getItem(`todos_${userId}_${dateStr}`))
    if (Array.isArray(data) && data.length > 0) {
      return { total: data.length, done: data.filter(t => t.done).length }
    }
  } catch { /* fall through */ }
  // 저장된 데이터 없으면 기본 7개 루틴 기준으로 표시
  return { total: DEFAULT_TOTAL, done: 0 }
}

export default function Calendar({ userId, onSelectDate }) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate())

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
          const stats = getTodoStats(userId, dateStr)
          const allDone = stats && stats.done === stats.total

          return (
            <button
              key={dateStr}
              className={`cal-cell${isToday ? ' today' : ''}${allDone ? ' all-done' : ''}`}
              onClick={() => onSelectDate(dateStr)}
            >
              <span className="cal-day-num">{day}</span>

              {stats && (
                <>
                  <div className="cal-progress-bar">
                    <div
                      className="cal-progress-fill"
                      style={{ width: `${Math.round((stats.done / stats.total) * 100)}%` }}
                    />
                  </div>
                  <span className="cal-stats">
                    {allDone
                      ? <span className="cal-all-done-icon">✓</span>
                      : <>{stats.done}<span className="cal-stats-sep">/</span>{stats.total}</>
                    }
                  </span>
                </>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

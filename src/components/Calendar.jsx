import { useState } from 'react'
import { getHabitStats } from '../hooks/useHabits'

const DAYS = ['일', '월', '화', '수', '목', '금', '토']

function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function getUserTodoStats(userId, dateStr) {
  try {
    const data = JSON.parse(localStorage.getItem(`todos_${userId}_${dateStr}`))
    if (Array.isArray(data) && data.length > 0) {
      return { total: data.length, done: data.filter(t => t.done).length }
    }
  } catch { /* ignore */ }
  return null
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
          const habitStats = getHabitStats(userId, dateStr)
          const todoStats = getUserTodoStats(userId, dateStr)
          const allHabitsDone = habitStats.done === habitStats.total
          const allTodosDone = todoStats ? todoStats.done === todoStats.total : true

          return (
            <button
              key={dateStr}
              className={`cal-cell${isToday ? ' today' : ''}${allHabitsDone && allTodosDone ? ' all-done' : ''}`}
              onClick={() => onSelectDate(dateStr)}
            >
              <span className="cal-day-num">{day}</span>

              <div className="cal-progress-bar">
                <div
                  className={`cal-progress-fill${allHabitsDone ? ' habit-complete' : ''}`}
                  style={{ width: `${Math.round((habitStats.done / habitStats.total) * 100)}%` }}
                />
              </div>

              <span className="cal-stats">
                {allHabitsDone
                  ? <span className="cal-all-done-icon">✓</span>
                  : <>{habitStats.done}<span className="cal-stats-sep">/</span>{habitStats.total}</>
                }
              </span>

              {todoStats && (
                <span className={`cal-todo-badge${todoStats.done === todoStats.total ? ' done' : ''}`}>
                  +{todoStats.done}/{todoStats.total}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

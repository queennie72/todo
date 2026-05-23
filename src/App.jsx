import { useState, useEffect } from 'react'
import AddForm from './components/AddForm'
import TodoList from './components/TodoList'
import Calendar from './components/Calendar'
import HabitItem from './components/HabitItem'
import MonthlyReview from './components/MonthlyReview'
import HealthRecord from './components/HealthRecord'
import AuthPage from './pages/AuthPage'
import { useAuth } from './hooks/useAuth'
import { useHabits, clearLegacyData } from './hooks/useHabits'

const HABIT_SECTIONS = [
  { name: '건강측정', color: '#3b82f6', indices: [0, 1] },
  { name: '식단',    color: '#22c55e', indices: [2, 4, 5] },
  { name: '생활습관', color: '#a855f7', indices: [3] },
  { name: '운동',    color: '#f97316', indices: [7, 8, 9] },
  { name: '하루정리', color: '#14b8a6', indices: [6] },
]

const EMOJIS = [
  { emoji: '😊', label: '행복' },  { emoji: '🥰', label: '사랑' },  { emoji: '🤩', label: '신남' },
  { emoji: '😎', label: '멋짐' },  { emoji: '🥳', label: '파티' },  { emoji: '😄', label: '기쁨' },
  { emoji: '🤗', label: '따뜻함' }, { emoji: '😌', label: '평온' },  { emoji: '🙂', label: '만족' },
  { emoji: '😴', label: '졸림' },  { emoji: '😪', label: '피곤' },  { emoji: '🥺', label: '슬픔' },
  { emoji: '😢', label: '눈물' },  { emoji: '😭', label: '통곡' },  { emoji: '😅', label: '당황' },
  { emoji: '😤', label: '답답' },  { emoji: '😡', label: '화남' },  { emoji: '🤔', label: '고민' },
]

async function compressImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const MAX = 900
        let { width, height } = img
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round(height * MAX / width); width = MAX }
          else { width = Math.round(width * MAX / height); height = MAX }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width; canvas.height = height
        canvas.getContext('2d').drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', 0.72))
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

function formatDateLabel(dateStr) {
  const [y, m, d] = dateStr.split('-')
  return `${y}년 ${Number(m)}월 ${Number(d)}일`
}

function shiftDate(dateStr, delta) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + delta)
  return d.toISOString().slice(0, 10)
}

function useLocalStorage(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try {
      const item = localStorage.getItem(key)
      return item !== null ? JSON.parse(item) : defaultValue
    } catch { return defaultValue }
  })

  useEffect(() => {
    try {
      const item = localStorage.getItem(key)
      setValue(item !== null ? JSON.parse(item) : defaultValue)
    } catch { setValue(defaultValue) }
  }, [key])

  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)) }
    catch { /* ignore quota errors */ }
  }, [key, value])

  return [value, setValue]
}

function useTodos(userId, dateStr) {
  const storageKey = `todos_${userId}_${dateStr}`

  const [todos, setTodos] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey))
      if (Array.isArray(saved)) return saved
    } catch { /* ignore */ }
    return []
  })

  useEffect(() => {
    setTodos(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(storageKey))
        if (Array.isArray(saved)) return saved
      } catch { /* ignore */ }
      return []
    })
  }, [storageKey])

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(todos))
  }, [todos, storageKey])

  const addTodo = (text) =>
    setTodos(prev => [{ id: Date.now(), text, done: false }, ...prev])
  const deleteTodo = (id) =>
    setTodos(prev => prev.filter(t => t.id !== id))
  const toggleTodo = (id) =>
    setTodos(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))
  const updateTodo = (id, text) =>
    setTodos(prev => prev.map(t => t.id === id ? { ...t, text } : t))
  const clearDone = () =>
    setTodos(prev => prev.filter(t => !t.done))

  return { todos, addTodo, deleteTodo, toggleTodo, updateTodo, clearDone }
}

function calcRunningTotals(userId, dateStr) {
  const [year, month] = dateStr.split('-')
  const prefix = `running_${userId}_`
  let monthDist = 0, monthMins = 0, yearDist = 0, yearMins = 0
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (!k.startsWith(prefix)) continue
    const datePart = k.slice(prefix.length)
    const [y, m] = datePart.split('-')
    if (y !== year) continue
    try {
      const d = JSON.parse(localStorage.getItem(k)) || {}
      const dist = parseFloat(d.dist) || 0
      const mins = (parseInt(d.hours) || 0) * 60 + (parseInt(d.mins) || 0)
      yearDist += dist
      yearMins += mins
      if (m === month) { monthDist += dist; monthMins += mins }
    } catch {}
  }
  return { monthDist, monthMins, yearDist, yearMins }
}

function fmtTime(totalMins) {
  if (totalMins === 0) return '0분'
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  if (h === 0) return `${m}분`
  return m > 0 ? `${h}시간 ${m}분` : `${h}시간`
}

function fmtDist(km) {
  return km % 1 === 0 ? `${km}km` : `${km.toFixed(1)}km`
}

function RunningRecord({ userId, dateStr }) {
  const key = `running_${userId}_${dateStr}`
  const [open, setOpen] = useState(false)
  const [data, setData] = useState(() => {
    try { return JSON.parse(localStorage.getItem(key)) || {} } catch { return {} }
  })
  const [totals, setTotals] = useState(() => calcRunningTotals(userId, dateStr))

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(key)) || {}
      setData(saved)
      setOpen(!!(saved.dist || saved.hours || saved.mins || saved.memo))
    } catch { setData({}) }
    setTotals(calcRunningTotals(userId, dateStr))
  }, [key])

  function update(field, value) {
    const next = { ...data, [field]: value }
    setData(next)
    localStorage.setItem(key, JSON.stringify(next))
    setTotals(calcRunningTotals(userId, dateStr))
  }

  const hasData = data.dist || data.hours || data.mins || data.memo
  const [year, month] = dateStr.split('-')

  return (
    <div className="running-record">
      <button className={`running-toggle${hasData ? ' has-data' : ''}`} onClick={() => setOpen(v => !v)}>
        <span>🏃 러닝 기록</span>
        {hasData && (
          <span className="running-summary">
            {data.dist ? fmtDist(parseFloat(data.dist)) : ''}
            {(data.hours || data.mins) ? ` ${data.hours || 0}시간 ${data.mins || 0}분` : ''}
          </span>
        )}
        <span className="running-arrow">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="running-body">
          <div className="running-row">
            <div className="running-field">
              <span className="running-label">거리</span>
              <div className="running-input-group">
                <input
                  type="number" step="0.1" min="0"
                  value={data.dist || ''}
                  onChange={e => update('dist', e.target.value)}
                  placeholder="0.0"
                  className="running-num-input"
                />
                <span className="running-unit">km</span>
              </div>
            </div>
            <div className="running-field">
              <span className="running-label">시간</span>
              <div className="running-input-group">
                <input
                  type="number" min="0" max="23"
                  value={data.hours || ''}
                  onChange={e => update('hours', e.target.value)}
                  placeholder="00"
                  className="running-time-input"
                />
                <span className="running-unit">시간</span>
                <input
                  type="number" min="0" max="59"
                  value={data.mins || ''}
                  onChange={e => update('mins', e.target.value)}
                  placeholder="00"
                  className="running-time-input"
                />
                <span className="running-unit">분</span>
              </div>
            </div>
          </div>
          <input
            type="text"
            className="running-memo-input"
            value={data.memo || ''}
            onChange={e => update('memo', e.target.value)}
            placeholder="한줄 메모"
            maxLength={80}
          />
          <div className="running-totals">
            <div className="running-total-row">
              <span className="running-total-label">{month}월 누적</span>
              <span className="running-total-val">{fmtDist(totals.monthDist)}</span>
              <span className="running-total-sep">·</span>
              <span className="running-total-val">{fmtTime(totals.monthMins)}</span>
            </div>
            <div className="running-total-row">
              <span className="running-total-label">{year}년 누적</span>
              <span className="running-total-val">{fmtDist(totals.yearDist)}</span>
              <span className="running-total-sep">·</span>
              <span className="running-total-val">{fmtTime(totals.yearMins)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ProgressBar({ total, done, label }) {
  if (total === 0) return null
  const pct = Math.round((done / total) * 100)
  const allDone = done === total
  return (
    <div className="progress-wrap">
      <div className="progress-track">
        <div className={`progress-fill${allDone ? ' complete' : ''}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`progress-label${allDone ? ' complete' : ''}`}>
        {allDone ? `🎉 ${label} 완료!` : `${done} / ${total} 완료`}
      </span>
    </div>
  )
}

function TodoApp({ user, date, onBack, onLogout, onDateChange }) {
  const { todos, addTodo, deleteTodo, toggleTodo, updateTodo, clearDone } = useTodos(user.id, date)
  const { habits, toggleHabit, checkHabit } = useHabits(user.id, date)
  const [emoji, setEmoji] = useLocalStorage(`emoji_${user.id}_${date}`, '')
  const [memo, setMemo] = useLocalStorage(`memo_${user.id}_${date}`, '')
  const [photo, setPhoto] = useLocalStorage(`photo_${user.id}_${date}`, '')

  const todoDone = todos.filter(t => t.done).length
  const habitDone = habits.filter(h => h.done).length
  const hasTodoDone = todoDone > 0

  async function handlePhotoChange(e) {
    const file = e.target.files[0]
    if (!file) return
    const compressed = await compressImage(file)
    setPhoto(compressed)
  }

  return (
    <main className="container">
      <header>
        <div className="header-left">
          <button className="btn-back" onClick={onBack}>‹</button>
          <div className="date-nav">
            <button className="btn-date-nav" onClick={() => onDateChange(shiftDate(date, -1))}>‹</button>
            <h1 className="date-title">{formatDateLabel(date)}</h1>
            <button className="btn-date-nav" onClick={() => onDateChange(shiftDate(date, 1))}>›</button>
          </div>
        </div>
        <div className="header-right">
          <span className="user-email">{user.email}</span>
          <button className="btn btn-ghost" onClick={onLogout}>로그아웃</button>
        </div>
      </header>

      {/* 내 할일 — 상단 강조 */}
      <section className="section section-mytodo">
        <div className="section-header">
          <span className="section-title">내 할일</span>
          {todos.length > 0 && <span className="section-count">{todoDone}/{todos.length}</span>}
        </div>
        {todos.length > 0 && <ProgressBar total={todos.length} done={todoDone} label="할일" />}
        <AddForm onAdd={addTodo} />
        <TodoList todos={todos} onToggle={toggleTodo} onDelete={deleteTodo} onUpdate={updateTodo} />
        {hasTodoDone && (
          <div className="section-footer">
            <button className="btn btn-ghost" onClick={clearDone}>완료 항목 삭제</button>
          </div>
        )}
      </section>

      {/* 오늘의 루틴 — 섹션별 2열 그리드 */}
      <section className="section">
        <div className="section-header">
          <span className="section-title">오늘의 루틴</span>
          <span className="section-count">{habitDone}/{habits.length}</span>
        </div>
        <ProgressBar total={habits.length} done={habitDone} label="루틴" />
        <div className="habit-sections-wrap">
          {HABIT_SECTIONS.map(sec => (
            <div key={sec.name} className="habit-sec-group">
              <span className="habit-sec-label" style={{ color: sec.color }}>{sec.name}</span>
              <ul className="habit-grid-2col">
                {sec.indices.map(idx => (
                  <HabitItem key={idx} habit={habits[idx]} onToggle={toggleHabit} compact />
                ))}
              </ul>
              {sec.name === '운동' && (
                <RunningRecord userId={user.id} dateStr={date} />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 건강 기록 */}
      <HealthRecord userId={user.id} dateStr={date} onHealthCheck={checkHabit} />

      {/* 오늘의 감정 */}
      <section className="section">
        <div className="section-header">
          <span className="section-title">오늘의 감정</span>
          {emoji && <span className="emoji-chosen">{emoji}</span>}
        </div>
        <div className="emoji-grid">
          {EMOJIS.map(({ emoji: em, label }) => (
            <button
              key={em}
              className={`emoji-btn${emoji === em ? ' selected' : ''}`}
              onClick={() => setEmoji(emoji === em ? '' : em)}
              title={label}
              aria-label={label}
            >
              {em}
            </button>
          ))}
        </div>
        {!emoji && <p className="emoji-hint">오늘의 감정을 골라보세요</p>}
      </section>

      {/* 하루 메모 */}
      <section className="section">
        <div className="section-header">
          <span className="section-title">하루 메모</span>
        </div>
        <textarea
          className="day-memo"
          placeholder="오늘 하루를 기록해보세요..."
          value={memo}
          onChange={e => setMemo(e.target.value)}
          rows={4}
        />
      </section>

      {/* 오늘의 사진 */}
      <section className="section">
        <div className="section-header">
          <span className="section-title">오늘의 사진</span>
        </div>
        {photo ? (
          <div className="photo-preview">
            <img src={photo} alt="오늘의 사진" className="day-photo" />
            <button className="btn btn-ghost" onClick={() => setPhoto('')}>사진 삭제</button>
          </div>
        ) : (
          <label className="photo-upload-label">
            <input type="file" accept="image/*" className="photo-input" onChange={handlePhotoChange} />
            <span className="photo-upload-plus">+</span>
            <span>사진 추가</span>
          </label>
        )}
      </section>
    </main>
  )
}

function CalendarView({ user, onSelectDate, onLogout, onReview }) {
  return (
    <main className="container">
      <div className="app-title-wrap">
        <h1 className="app-title">Doing Doing</h1>
      </div>
      <header>
        <div className="header-right" style={{ marginLeft: 'auto' }}>
          <button className="btn btn-ghost" onClick={onReview}>한달 리뷰</button>
          <span className="user-email">{user.email}</span>
          <button className="btn btn-ghost" onClick={onLogout}>로그아웃</button>
        </div>
      </header>
      <Calendar userId={user.id} onSelectDate={onSelectDate} />
    </main>
  )
}

export default function App() {
  const { user, login, register, logout } = useAuth()
  const [selectedDate, setSelectedDate] = useState(null)
  const [view, setView] = useState('calendar')

  useEffect(() => {
    if (user) clearLegacyData(user.id)
  }, [user?.id])

  if (!user) return <AuthPage onLogin={login} onRegister={register} />

  if (view === 'review') {
    return <MonthlyReview userId={user.id} onBack={() => setView('calendar')} />
  }

  if (!selectedDate) {
    return (
      <CalendarView
        user={user}
        onSelectDate={setSelectedDate}
        onLogout={logout}
        onReview={() => setView('review')}
      />
    )
  }

  return (
    <TodoApp
      user={user}
      date={selectedDate}
      onBack={() => setSelectedDate(null)}
      onLogout={logout}
      onDateChange={setSelectedDate}
    />
  )
}

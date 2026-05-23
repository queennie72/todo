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

function TodoApp({ user, date, onBack, onLogout }) {
  const { todos, addTodo, deleteTodo, toggleTodo, updateTodo, clearDone } = useTodos(user.id, date)
  const { habits, toggleHabit } = useHabits(user.id, date)
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
          <h1 className="date-title">{formatDateLabel(date)}</h1>
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
            </div>
          ))}
        </div>
      </section>

      {/* 건강 기록 */}
      <HealthRecord userId={user.id} dateStr={date} />

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
      <header>
        <div className="header-left">
          <h1>Todo</h1>
        </div>
        <div className="header-right">
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
    />
  )
}

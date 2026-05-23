import { useState, useEffect } from 'react'
import AddForm from './components/AddForm'
import TodoList from './components/TodoList'
import Calendar from './components/Calendar'
import AuthPage from './pages/AuthPage'
import { useAuth } from './hooks/useAuth'

const DAILY_HABITS = [
  '인바디 측정',
  '공복혈당 측정',
  '단백질 95g 섭취',
  '애플워치 움직이기 링 완성',
  '하루 물 2L 마시기',
  '영양제 챙겨 먹기',
  '오늘 하루 리뷰하기',
]

function makeDefaultTodos(dateStr) {
  const base = new Date(dateStr).getTime()
  return DAILY_HABITS.map((text, i) => ({
    id: base + i + 1,
    text,
    done: false,
    isHabit: true,
  }))
}

function formatDateLabel(dateStr) {
  const [y, m, d] = dateStr.split('-')
  return `${y}년 ${Number(m)}월 ${Number(d)}일`
}

function useTodos(userId, dateStr) {
  const storageKey = `todos_${userId}_${dateStr}`

  const [todos, setTodos] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey))
      if (Array.isArray(saved) && saved.length > 0) return saved
      return makeDefaultTodos(dateStr)
    } catch {
      return makeDefaultTodos(dateStr)
    }
  })

  useEffect(() => {
    setTodos(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(storageKey))
        if (Array.isArray(saved) && saved.length > 0) return saved
        return makeDefaultTodos(dateStr)
      } catch { return makeDefaultTodos(dateStr) }
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

function ProgressBar({ total, done }) {
  if (total === 0) return null
  const pct = Math.round((done / total) * 100)
  const allDone = done === total
  return (
    <div className="progress-wrap">
      <div className="progress-track">
        <div
          className={`progress-fill${allDone ? ' complete' : ''}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`progress-label${allDone ? ' complete' : ''}`}>
        {allDone ? '🎉 모두 완료!' : `${done} / ${total} 완료`}
      </span>
    </div>
  )
}

function TodoApp({ user, date, onBack, onLogout }) {
  const { todos, addTodo, deleteTodo, toggleTodo, updateTodo, clearDone } = useTodos(user.id, date)

  const done = todos.filter(t => t.done).length
  const hasDone = done > 0

  return (
    <main className="container">
      <header>
        <div className="header-left">
          <button className="btn-back" onClick={onBack}>‹</button>
          <div>
            <h1 className="date-title">{formatDateLabel(date)}</h1>
          </div>
        </div>
        <div className="header-right">
          <span className="user-email">{user.email}</span>
          <button className="btn btn-ghost" onClick={onLogout}>로그아웃</button>
        </div>
      </header>

      <ProgressBar total={todos.length} done={done} />

      <AddForm onAdd={addTodo} />

      <TodoList
        todos={todos}
        onToggle={toggleTodo}
        onDelete={deleteTodo}
        onUpdate={updateTodo}
      />

      {hasDone && (
        <footer className="footer">
          <button className="btn btn-ghost" onClick={clearDone}>완료 항목 삭제</button>
        </footer>
      )}
    </main>
  )
}

function CalendarView({ user, onSelectDate, onLogout }) {
  return (
    <main className="container">
      <header>
        <div className="header-left">
          <h1>Todo</h1>
        </div>
        <div className="header-right">
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

  if (!user) return <AuthPage onLogin={login} onRegister={register} />

  if (!selectedDate) {
    return (
      <CalendarView
        user={user}
        onSelectDate={setSelectedDate}
        onLogout={logout}
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

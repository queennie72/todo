import { useState, useEffect } from 'react'
import AddForm from './components/AddForm'
import TodoList from './components/TodoList'
import Calendar from './components/Calendar'
import HabitItem from './components/HabitItem'
import AuthPage from './pages/AuthPage'
import { useAuth } from './hooks/useAuth'
import { useHabits, clearLegacyData } from './hooks/useHabits'

function formatDateLabel(dateStr) {
  const [y, m, d] = dateStr.split('-')
  return `${y}년 ${Number(m)}월 ${Number(d)}일`
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
        <div
          className={`progress-fill${allDone ? ' complete' : ''}`}
          style={{ width: `${pct}%` }}
        />
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

  const habitDone = habits.filter(h => h.done).length
  const todoDone = todos.filter(t => t.done).length
  const hasTodoDone = todoDone > 0

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

      <section className="section">
        <div className="section-header">
          <span className="section-title">오늘의 루틴</span>
          <span className="section-count">{habitDone}/{habits.length}</span>
        </div>
        <ProgressBar total={habits.length} done={habitDone} label="루틴" />
        <ul className="habit-list">
          {habits.map(habit => (
            <HabitItem key={habit.id} habit={habit} onToggle={toggleHabit} />
          ))}
        </ul>
      </section>

      <section className="section">
        <div className="section-header">
          <span className="section-title">내 할일</span>
          {todos.length > 0 && (
            <span className="section-count">{todoDone}/{todos.length}</span>
          )}
        </div>
        {todos.length > 0 && (
          <ProgressBar total={todos.length} done={todoDone} label="할일" />
        )}
        <AddForm onAdd={addTodo} />
        <TodoList
          todos={todos}
          onToggle={toggleTodo}
          onDelete={deleteTodo}
          onUpdate={updateTodo}
        />
        {hasTodoDone && (
          <div className="section-footer">
            <button className="btn btn-ghost" onClick={clearDone}>완료 항목 삭제</button>
          </div>
        )}
      </section>
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

  useEffect(() => {
    if (user) clearLegacyData(user.id)
  }, [user?.id])

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

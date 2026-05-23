import { useState, useEffect } from 'react'
import AddForm from './components/AddForm'
import TodoList from './components/TodoList'
import AuthPage from './pages/AuthPage'
import { useAuth } from './hooks/useAuth'

function useTodos(userId) {
  const storageKey = `todos_${userId}`

  const [todos, setTodos] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey)) || []
    } catch {
      return []
    }
  })

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

function TodoApp({ user, onLogout }) {
  const { todos, addTodo, deleteTodo, toggleTodo, updateTodo, clearDone } = useTodos(user.id)

  const remaining = todos.filter(t => !t.done).length
  const hasDone = todos.some(t => t.done)

  const summaryText = todos.length === 0
    ? ''
    : remaining === 0
    ? '모두 완료!'
    : `${remaining}개 남음`

  return (
    <main className="container">
      <header>
        <div className="header-left">
          <h1>Todo</h1>
          {summaryText && <p className="summary">{summaryText}</p>}
        </div>
        <div className="header-right">
          <span className="user-email">{user.email}</span>
          <button className="btn btn-ghost" onClick={onLogout}>로그아웃</button>
        </div>
      </header>

      <AddForm onAdd={addTodo} />

      <TodoList
        todos={todos}
        onToggle={toggleTodo}
        onDelete={deleteTodo}
        onUpdate={updateTodo}
      />

      {hasDone && (
        <footer className="footer">
          <button className="btn btn-ghost" onClick={clearDone}>
            완료 항목 삭제
          </button>
        </footer>
      )}
    </main>
  )
}

export default function App() {
  const { user, login, register, logout } = useAuth()

  if (!user) {
    return <AuthPage onLogin={login} onRegister={register} />
  }

  return <TodoApp user={user} onLogout={logout} />
}

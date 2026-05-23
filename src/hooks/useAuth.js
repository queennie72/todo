import { useState } from 'react'

const USERS_KEY = 'auth_users'
const SESSION_KEY = 'auth_session'

function getUsers() {
  try { return JSON.parse(localStorage.getItem(USERS_KEY)) || {} } catch { return {} }
}

function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)) } catch { return null }
}

export function useAuth() {
  const [user, setUser] = useState(getSession)

  function login(email, password) {
    const users = getUsers()
    const stored = users[email.toLowerCase()]
    if (!stored || stored.password !== btoa(password)) {
      throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.')
    }
    const session = { id: stored.id, email: email.toLowerCase() }
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    setUser(session)
  }

  function register(email, password) {
    const users = getUsers()
    const key = email.toLowerCase()
    if (users[key]) throw new Error('이미 사용 중인 이메일입니다.')
    const id = crypto.randomUUID()
    users[key] = { id, password: btoa(password) }
    localStorage.setItem(USERS_KEY, JSON.stringify(users))
    const session = { id, email: key }
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    setUser(session)
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY)
    setUser(null)
  }

  return { user, login, register, logout }
}

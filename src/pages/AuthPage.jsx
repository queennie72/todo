import { useState } from 'react'

const REMEMBER_KEY = 'auth_remember_email'

function IconUser() {
  return (
    <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  )
}

function IconEmail() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M2 7l10 7 10-7" />
    </svg>
  )
}

function IconLock() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  )
}

export default function AuthPage({ onLogin, onRegister }) {
  const savedEmail = localStorage.getItem(REMEMBER_KEY) || ''
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState(savedEmail)
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(!!savedEmail)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      if (mode === 'login') {
        await onLogin(email, password)
        if (remember) localStorage.setItem(REMEMBER_KEY, email.toLowerCase())
        else localStorage.removeItem(REMEMBER_KEY)
      } else {
        onRegister(email, password)
      }
    } catch (err) {
      setError(err.message)
    }
  }

  function switchMode() {
    setMode(m => m === 'login' ? 'register' : 'login')
    setError('')
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-avatar">
          <IconUser />
        </div>

        <h1 className="auth-logo">퀴니의 두잉두잉</h1>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <span className="input-icon"><IconEmail /></span>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="이메일"
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <span className="input-icon"><IconLock /></span>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={mode === 'register' ? '비밀번호 (6자 이상)' : '비밀번호'}
              required
              minLength={mode === 'register' ? 6 : 1}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          {error && <p className="auth-error">{error}</p>}

          {mode === 'login' && (
            <div className="auth-meta">
              <label className="remember-label">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={e => setRemember(e.target.checked)}
                />
                아이디 기억하기
              </label>
            </div>
          )}

          <button type="submit" className="btn btn-auth">
            {mode === 'login' ? '로그인' : '회원가입'}
          </button>
        </form>

        <p className="auth-switch">
          {mode === 'login' ? '계정이 없으신가요?' : '이미 계정이 있으신가요?'}
          {' '}
          <button type="button" className="link-btn" onClick={switchMode}>
            {mode === 'login' ? '회원가입' : '로그인'}
          </button>
        </p>
      </div>
    </div>
  )
}

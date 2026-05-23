import { useState, useEffect } from 'react'

export const DAILY_HABITS = [
  '인바디 측정',
  '공복혈당 측정',
  '단백질 95g 섭취',
  '애플워치 움직이기 링 완성',
  '하루 물 2L 마시기',
  '영양제 챙겨 먹기',
  '오늘 하루 리뷰하기',
  'F45출석',
  'RUN',
  '그외운동',
]

function habitKey(userId, dateStr) {
  return `habits_${userId}_${dateStr}`
}

function loadStates(userId, dateStr) {
  try {
    const saved = JSON.parse(localStorage.getItem(habitKey(userId, dateStr)))
    if (Array.isArray(saved) && saved.length === DAILY_HABITS.length) return saved
  } catch { /* ignore */ }
  return DAILY_HABITS.map(() => false)
}

export function useHabits(userId, dateStr) {
  const [states, setStates] = useState(() => loadStates(userId, dateStr))

  useEffect(() => {
    setStates(loadStates(userId, dateStr))
  }, [userId, dateStr])

  useEffect(() => {
    localStorage.setItem(habitKey(userId, dateStr), JSON.stringify(states))
  }, [states, userId, dateStr])

  const habits = DAILY_HABITS.map((text, i) => ({ id: i, text, done: states[i] }))

  const toggleHabit = (id) =>
    setStates(prev => prev.map((d, i) => i === id ? !d : d))

  return { habits, toggleHabit }
}

// 달력용 — 훅 없이 직접 읽기
export function getHabitStats(userId, dateStr) {
  try {
    const saved = JSON.parse(localStorage.getItem(habitKey(userId, dateStr)))
    if (Array.isArray(saved)) {
      return { done: saved.filter(Boolean).length, total: DAILY_HABITS.length }
    }
  } catch { /* ignore */ }
  return { done: 0, total: DAILY_HABITS.length }
}

// 기존 todos_* 데이터 초기화 (1회 마이그레이션)
export function clearLegacyData(userId) {
  const flagKey = `reset_v4_${userId}`
  if (localStorage.getItem(flagKey)) return
  const toDelete = Object.keys(localStorage).filter(k =>
    k.startsWith(`todos_${userId}_`) || k.startsWith(`habits_${userId}_`)
  )
  toDelete.forEach(k => localStorage.removeItem(k))
  localStorage.setItem(flagKey, '1')
}

import { useState, useEffect } from 'react'
import { loadHabitDefs, OLD_INDEX_TO_ID } from '../lib/habitDefs'

function habitKey(userId, dateStr) {
  return `habits_${userId}_${dateStr}`
}

function loadStates(userId, dateStr) {
  try {
    const saved = JSON.parse(localStorage.getItem(habitKey(userId, dateStr)))
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) return saved
    if (Array.isArray(saved)) {
      const migrated = {}
      saved.forEach((v, i) => { if (OLD_INDEX_TO_ID[i]) migrated[OLD_INDEX_TO_ID[i]] = !!v })
      return migrated
    }
  } catch {}
  return {}
}

export function useHabits(userId, dateStr) {
  const [defs, setDefs] = useState(() => loadHabitDefs(userId))
  const [states, setStates] = useState(() => loadStates(userId, dateStr))

  useEffect(() => { setDefs(loadHabitDefs(userId)) }, [userId])
  useEffect(() => { setStates(loadStates(userId, dateStr)) }, [userId, dateStr])
  useEffect(() => {
    localStorage.setItem(habitKey(userId, dateStr), JSON.stringify(states))
  }, [states, userId, dateStr])

  const habits = defs.habits.map(h => ({ ...h, text: h.name, done: !!states[h.id] }))

  const toggleHabit = (id) => setStates(prev => ({ ...prev, [id]: !prev[id] }))
  const checkHabit = (id) => setStates(prev => ({ ...prev, [id]: true }))

  return { habits, defs, toggleHabit, checkHabit }
}

export function getHabitStats(userId, dateStr) {
  const defs = loadHabitDefs(userId)
  const total = defs.habits.length
  try {
    const saved = JSON.parse(localStorage.getItem(habitKey(userId, dateStr)))
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
      return { done: Object.values(saved).filter(Boolean).length, total }
    }
    if (Array.isArray(saved)) return { done: saved.filter(Boolean).length, total }
  } catch {}
  return { done: 0, total }
}

export function clearLegacyData(userId) {
  const flagKey = `reset_v4_${userId}`
  if (localStorage.getItem(flagKey)) return
  const toDelete = Object.keys(localStorage).filter(k =>
    k.startsWith(`todos_${userId}_`) || k.startsWith(`habits_${userId}_`)
  )
  toDelete.forEach(k => localStorage.removeItem(k))
  localStorage.setItem(flagKey, '1')
}

export const DEFAULT_SECTIONS = [
  { id: 'sec_health',  name: '건강측정', color: '#3b82f6' },
  { id: 'sec_diet',    name: '식단',    color: '#22c55e' },
  { id: 'sec_life',    name: '생활습관', color: '#a855f7' },
  { id: 'sec_workout', name: '운동',    color: '#f97316' },
  { id: 'sec_review',  name: '하루정리', color: '#14b8a6' },
]

export const DEFAULT_HABITS = [
  { id: 'hab_inbody',   sectionId: 'sec_health',  name: '인바디 측정' },
  { id: 'hab_blood',    sectionId: 'sec_health',  name: '공복혈당 측정' },
  { id: 'hab_protein',  sectionId: 'sec_diet',    name: '단백질 95g 섭취' },
  { id: 'hab_water',    sectionId: 'sec_diet',    name: '하루 물 2L 마시기' },
  { id: 'hab_vitamins', sectionId: 'sec_diet',    name: '영양제 챙겨 먹기' },
  { id: 'hab_ring',     sectionId: 'sec_life',    name: '애플워치 움직이기 링 완성' },
  { id: 'hab_review',   sectionId: 'sec_review',  name: '오늘 하루 리뷰하기' },
  { id: 'hab_f45',      sectionId: 'sec_workout', name: 'F45출석' },
  { id: 'hab_run',      sectionId: 'sec_workout', name: 'RUN' },
  { id: 'hab_exercise', sectionId: 'sec_workout', name: '그외운동' },
]

// Original array index → stable ID (for migrating old boolean[] data)
export const OLD_INDEX_TO_ID = [
  'hab_inbody', 'hab_blood', 'hab_protein', 'hab_ring', 'hab_water',
  'hab_vitamins', 'hab_review', 'hab_f45', 'hab_run', 'hab_exercise',
]

export function loadHabitDefs(userId) {
  try {
    const saved = JSON.parse(localStorage.getItem(`habit_def_${userId}`))
    if (saved?.sections?.length && saved?.habits?.length) return saved
  } catch {}
  return { sections: DEFAULT_SECTIONS, habits: DEFAULT_HABITS }
}

export function saveHabitDefs(userId, defs) {
  localStorage.setItem(`habit_def_${userId}`, JSON.stringify(defs))
}

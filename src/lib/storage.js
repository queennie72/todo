// 로컬 서버(3001)와 localStorage를 동기화하는 스토리지 레이어
// - 읽기: localStorage (빠른 캐시)
// - 쓰기: localStorage 즉시 + 서버 비동기 백업
// - 초기화: 서버 데이터를 localStorage로 복원

const API = '/api/store'

let serverAvailable = false

async function ping() {
  try {
    const res = await fetch(API, { signal: AbortSignal.timeout(1500) })
    serverAvailable = res.ok
  } catch {
    serverAvailable = false
  }
}

// 서버로 단일 키 저장 (fire-and-forget)
function syncSet(key, value) {
  if (!serverAvailable) return
  fetch(`${API}/${encodeURIComponent(key)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value }),
  }).catch(() => { serverAvailable = false })
}

// 서버로 단일 키 삭제 (fire-and-forget)
function syncDelete(key) {
  if (!serverAvailable) return
  fetch(`${API}/${encodeURIComponent(key)}`, { method: 'DELETE' })
    .catch(() => { serverAvailable = false })
}

// localStorage.setItem / removeItem 을 오버라이드해서 모든 쓰기를 자동 백업
const _setItem = localStorage.setItem.bind(localStorage)
const _removeItem = localStorage.removeItem.bind(localStorage)

localStorage.setItem = (key, value) => {
  _setItem(key, value)
  try { syncSet(key, JSON.parse(value)) } catch { syncSet(key, value) }
}

localStorage.removeItem = (key) => {
  _removeItem(key)
  syncDelete(key)
}

// 앱 시작 시 서버 데이터를 localStorage로 복원
export async function initStorage() {
  await ping()
  if (!serverAvailable) {
    console.info('[storage] 서버 없음 — localStorage 모드')
    return
  }
  try {
    const res = await fetch(API)
    if (!res.ok) return
    const data = await res.json()
    const count = Object.keys(data).length
    for (const [key, value] of Object.entries(data)) {
      _setItem(key, JSON.stringify(value))
    }
    console.info(`[storage] 서버에서 ${count}개 항목 복원 완료`)
  } catch (e) {
    console.warn('[storage] 복원 실패:', e)
  }
}

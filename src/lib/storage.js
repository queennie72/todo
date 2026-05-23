// 로컬 서버(3001)와 localStorage 양방향 동기화
// 앱 시작 시:
//   1. 서버 데이터 → localStorage 복원 (서버 우선)
//   2. localStorage에만 있는 키 → 서버에 업로드 (노트북 기존 데이터 백업)
// 이후 쓰기:
//   localStorage 즉시 저장 + 서버 비동기 백업

const API = '/api/store'

let serverAvailable = false

async function ping() {
  try {
    const res = await fetch(API, { signal: AbortSignal.timeout(2000) })
    serverAvailable = res.ok
  } catch {
    serverAvailable = false
  }
}

function syncSet(key, value) {
  if (!serverAvailable) return
  fetch(`${API}/${encodeURIComponent(key)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value }),
  }).catch(() => { serverAvailable = false })
}

function syncDelete(key) {
  if (!serverAvailable) return
  fetch(`${API}/${encodeURIComponent(key)}`, { method: 'DELETE' })
    .catch(() => { serverAvailable = false })
}

// localStorage.setItem / removeItem 오버라이드 (모든 쓰기 자동 백업)
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

// 앱 시작 시 양방향 동기화
export async function initStorage() {
  await ping()
  if (!serverAvailable) {
    console.info('[storage] 서버 없음 — localStorage 모드')
    return
  }

  try {
    const res = await fetch(API)
    if (!res.ok) return
    const serverData = await res.json()

    // ── 1. 서버 → localStorage (서버 데이터 복원, 서버 우선) ──
    for (const [key, value] of Object.entries(serverData)) {
      _setItem(key, JSON.stringify(value))
    }

    // ── 2. localStorage → 서버 (서버에 없는 로컬 데이터 업로드) ──
    const toUpload = {}
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!(key in serverData)) {
        try { toUpload[key] = JSON.parse(localStorage.getItem(key)) }
        catch { toUpload[key] = localStorage.getItem(key) }
      }
    }

    if (Object.keys(toUpload).length > 0) {
      await fetch(`${API}/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toUpload),
      })
      console.info(`[storage] 서버 업로드: ${Object.keys(toUpload).length}개 항목`)
    }

    const serverCount = Object.keys(serverData).length
    const uploadCount = Object.keys(toUpload).length
    console.info(`[storage] 동기화 완료 — 서버 ${serverCount}개 복원, ${uploadCount}개 신규 업로드`)
  } catch (e) {
    console.warn('[storage] 동기화 실패:', e)
  }
}

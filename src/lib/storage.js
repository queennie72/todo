// 로컬 서버(3001)와 localStorage 양방향 동기화
// Storage.prototype을 오버라이드해서 모든 setItem/removeItem을 자동 백업

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

// Storage.prototype 오버라이드 (localStorage.setItem = fn 방식은 항목으로 저장되는 버그 있음)
const _setItem    = Storage.prototype.setItem
const _removeItem = Storage.prototype.removeItem

Storage.prototype.setItem = function (key, value) {
  _setItem.call(this, key, value)
  if (this === localStorage) {
    try { syncSet(key, JSON.parse(value)) } catch { syncSet(key, value) }
  }
}

Storage.prototype.removeItem = function (key) {
  _removeItem.call(this, key)
  if (this === localStorage) {
    syncDelete(key)
  }
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

    // 1. 서버 → localStorage (서버 데이터 복원, 원본 _setItem 사용해 재귀 방지)
    for (const [key, value] of Object.entries(serverData)) {
      _setItem.call(localStorage, key, JSON.stringify(value))
    }

    // 2. localStorage에만 있는 키 → 서버로 업로드
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

    console.info(`[storage] 동기화 완료 — 서버 ${Object.keys(serverData).length}개 복원, ${Object.keys(toUpload).length}개 신규 업로드`)
  } catch (e) {
    console.warn('[storage] 동기화 실패:', e)
  }
}

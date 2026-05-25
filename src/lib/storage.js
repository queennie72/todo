// 로컬 서버(3001)와 localStorage 양방향 동기화

const API = '/api/store'

let serverAvailable = false

async function ping() {
  const ctrl = new AbortController()
  const tid = setTimeout(() => ctrl.abort(), 2000)
  try {
    const res = await fetch(API, { signal: ctrl.signal })
    serverAvailable = res.ok
  } catch {
    serverAvailable = false
  } finally {
    clearTimeout(tid)
  }
}

function isBase64Image(v) {
  return typeof v === 'string' && v.startsWith('data:image/')
}

function stripPhotos(obj) {
  if (!obj || typeof obj !== 'object') return obj
  const out = {}
  for (const [k, v] of Object.entries(obj)) {
    if (!isBase64Image(v)) out[k] = v
  }
  return out
}

function isPhotoKey(key) {
  return key.startsWith('photo_') || key.endsWith('_photo')
}

function syncSet(key, value) {
  if (!serverAvailable) return
  if (isBase64Image(value)) return
  // 사진 키에 빈 값 동기화 금지 — useLocalStorage 기본값('')이 서버 사진을 덮어쓰는 것 방지
  if (value === '' && isPhotoKey(key)) return
  const syncValue = (value && typeof value === 'object') ? stripPhotos(value) : value
  fetch(`${API}/${encodeURIComponent(key)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value: syncValue }),
  }).catch(err => console.warn('[storage] syncSet 실패:', key, err?.message))
}

function syncDelete(key) {
  if (!serverAvailable) return
  fetch(`${API}/${encodeURIComponent(key)}`, { method: 'DELETE' })
    .catch(err => console.warn('[storage] syncDelete 실패:', key, err?.message))
}

const _setItem    = Storage.prototype.setItem
const _removeItem = Storage.prototype.removeItem

Storage.prototype.setItem = function (key, value) {
  _setItem.call(this, key, value)
  if (this === localStorage) {
    // 원시 base64 이미지는 서버 동기화 제외
    if (isBase64Image(value)) return
    try {
      const parsed = JSON.parse(value)
      // JSON으로 감싸진 base64 이미지도 제외
      if (isBase64Image(parsed)) return
      syncSet(key, parsed)
    } catch {
      syncSet(key, value)
    }
  }
}

Storage.prototype.removeItem = function (key) {
  _removeItem.call(this, key)
  if (this === localStorage) syncDelete(key)
}

const JUNK_KEYS = new Set(['setItem', 'removeItem'])

export async function initStorage() {
  await ping()
  if (!serverAvailable) {
    console.info('[storage] 서버 없음 — localStorage 모드')
    JUNK_KEYS.forEach(k => { if (localStorage.getItem(k) !== null) _removeItem.call(localStorage, k) })
    return
  }

  try {
    const res = await fetch(API)
    if (!res.ok) return
    const serverData = await res.json()

    for (const k of JUNK_KEYS) {
      if (k in serverData) syncDelete(k)
      if (localStorage.getItem(k) !== null) _removeItem.call(localStorage, k)
    }

    // 서버 → localStorage: 기존 키가 없거나, 서버에 실제 사진이 있는데 로컬이 빈 값인 경우 복원
    for (const [key, value] of Object.entries(serverData)) {
      if (JUNK_KEYS.has(key)) continue
      const localRaw = localStorage.getItem(key)
      if (localRaw === null) {
        try { _setItem.call(localStorage, key, JSON.stringify(value)) } catch {}
      } else if (typeof value === 'string' && value.startsWith('data:image/')) {
        // 서버에 실제 사진 데이터가 있으면 로컬이 비어있어도 덮어쓰기
        try {
          const localParsed = JSON.parse(localRaw)
          const localIsPhoto = typeof localParsed === 'string' && localParsed.startsWith('data:image/')
          if (!localIsPhoto) {
            try { _setItem.call(localStorage, key, JSON.stringify(value)) } catch {}
          }
        } catch {
          try { _setItem.call(localStorage, key, JSON.stringify(value)) } catch {}
        }
      }
    }

    // localStorage에만 있는 키 → 서버로 업로드 (사진 제외)
    const toUpload = {}
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (JUNK_KEYS.has(key)) continue
      if (key in serverData) continue
      try {
        const parsed = JSON.parse(localStorage.getItem(key))
        if (isBase64Image(parsed)) continue
        toUpload[key] = (parsed && typeof parsed === 'object') ? stripPhotos(parsed) : parsed
      } catch {
        const raw = localStorage.getItem(key)
        if (!isBase64Image(raw)) toUpload[key] = raw
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

    console.info(`[storage] 동기화 완료`)
  } catch (e) {
    console.warn('[storage] 동기화 실패:', e)
  }
}

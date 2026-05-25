import { useState, useEffect } from 'react'

const DEFAULT_GOAL = 2000

const MACROS = [
  { key: 'carbs',   label: '탄수화물', short: '탄', color: '#818cf8', kcalPer: 4 },
  { key: 'protein', label: '단백질',   short: '단', color: '#34d399', kcalPer: 4 },
  { key: 'fat',     label: '지방',     short: '지', color: '#fb923c', kcalPer: 9 },
]

function stripCommas(t) {
  return t.replace(/(\d),(\d)/g, '$1$2')
}

function firstMatch(t, patterns) {
  for (const pat of patterns) {
    const m = t.match(pat)
    if (m) return m[1]
  }
  return null
}

// OCR이 'g' 단위를 숫자로 오독할 때 실제 값 복원
// 예: 92g→920, 71g→7109, 120g→1209, 47g→470
function cleanGrams(raw) {
  if (!raw) return null
  let s = String(parseInt(raw, 10))
  // 500 초과: 마지막 자리 제거 (명백한 오독)
  while (s.length > 1 && parseInt(s, 10) > 500) {
    s = s.slice(0, -1)
  }
  // 400 초과이면서 끝자리 0: g→0 오독 의심 (47g→470 등)
  if (parseInt(s, 10) > 400 && s.endsWith('0')) {
    s = s.slice(0, -1)
  }
  const n = parseInt(s, 10)
  return n >= 5 ? String(n) : null
}

function extractDayNutrition(text) {
  const t = stripCommas(text)
  const result = {}

  // ── 총 섭취 칼로리 / 목표 ─────────────────────────────
  // 실제 OCR: "총 섭취                      1737 / 1300kcal"
  const calGoalM = t.match(/총\s*섭취[^\d]{0,80}(\d{3,5})[^\d\/]{0,5}\/[^\d]*(\d{3,5})/)
  if (calGoalM) {
    result.calories = calGoalM[1]
    result.goal     = calGoalM[2]
  } else {
    const cal = firstMatch(t, [
      /총\s*섭취[^\d]{0,80}(\d{3,5})/,
      /총\s*칼로리[^\d]{0,30}(\d{3,5})/,
    ])
    if (cal) result.calories = cal
    const goal = firstMatch(t, [/목표[^\d]{0,30}(\d{3,5})/, /권장[^\d]{0,30}(\d{3,5})/])
    if (goal) result.goal = goal
  }

  // ── 탄·단·지 ──────────────────────────────────────────
  // 실제 OCR: "@ 탄수화물 21%                920"
  // g가 0·9 등으로 오독 → cleanGrams()로 복원 (920→92, 7109→71, 1209→120)
  function parseMacro(longLabel, shortLabel) {
    // 형식A: @ label pct%   [spaces]  number (필라이즈 기본)
    const rA = new RegExp(
      `(?:@[^\\n]{0,4})?(?:${longLabel}|${shortLabel})[^\\d]{0,6}(\\d{1,3})\\s*%[^\\d]{0,80}(\\d{2,6})`
    )
    const mA = t.match(rA)
    if (mA) return { pct: mA[1], g: cleanGrams(mA[2]) }

    // 형식B: label n/ng pct% (슬래시)
    const rB = new RegExp(
      `(?:${longLabel}|${shortLabel})\\s+(\\d{1,4})\\/(\\d{1,4})g?\\s*(\\d{1,3})%`
    )
    const mB = t.match(rB)
    if (mB) return { g: mB[1], goalG: mB[2], pct: mB[3] }

    return null
  }

  const carbsM   = parseMacro('탄수화물', '탄')
  const proteinM = parseMacro('단백질',   '단')
  const fatM     = parseMacro('지방',     '지')

  if (carbsM?.g)       result.carbs       = carbsM.g
  if (carbsM?.goalG)   result.carbsGoal   = carbsM.goalG
  if (carbsM?.pct)     result.carbsPct    = carbsM.pct
  if (proteinM?.g)     result.protein     = proteinM.g
  if (proteinM?.goalG) result.proteinGoal = proteinM.goalG
  if (proteinM?.pct)   result.proteinPct  = proteinM.pct
  if (fatM?.g)         result.fat         = fatM.g
  if (fatM?.goalG)     result.fatGoal     = fatM.goalG
  if (fatM?.pct)       result.fatPct      = fatM.pct

  // ── 끼니별 칼로리 ─────────────────────────────────────
  // 실제 OCR: "점심             775 kcal"
  const mealPats = [
    { key: 'breakfastCal', re: /아침[^\d]{0,30}(\d{3,4})/ },
    { key: 'lunchCal',     re: /점심[^\d]{0,30}(\d{3,4})/ },
    { key: 'dinnerCal',    re: /저녁[^\d]{0,30}(\d{3,4})/ },
    { key: 'snackCal',     re: /간식[^\d]{0,30}(\d{3,4})/ },
  ]
  for (const { key: mk, re } of mealPats) {
    const m = t.match(re)
    if (m) result[mk] = m[1]
  }

  return result
}

async function compressImg(file) {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onerror = () => rej(new Error('파일 읽기 실패'))
    r.onload = e => {
      const img = new Image()
      img.onerror = () => rej(new Error('이미지 로드 실패'))
      img.onload = () => {
        const MAX = 1400
        let { width: w, height: h } = img
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h * MAX / w); w = MAX }
          else { w = Math.round(w * MAX / h); h = MAX }
        }
        const c = document.createElement('canvas')
        c.width = w; c.height = h
        c.getContext('2d').drawImage(img, 0, 0, w, h)
        res(c.toDataURL('image/jpeg', 0.82))
      }
      img.src = e.target.result
    }
    r.readAsDataURL(file)
  })
}

export default function DietRecord({ userId, dateStr, onProteinCheck }) {
  const key = `diet_${userId}_${dateStr}`

  const [open, setOpen]       = useState(false)
  const [dayPhoto, setDayPhoto] = useState('')
  const [data, setData]       = useState({})
  const [scanning, setScanning] = useState(false)
  const [scanMsg, setScanMsg] = useState('')
  const [ocrText, setOcrText] = useState('')
  const [showOcr, setShowOcr] = useState(false)
  const [saveState, setSaveState] = useState('')  // '' | 'ready' | 'saving' | 'done'

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const saved = JSON.parse(localStorage.getItem(key)) || {}

        // 사진: localStorage → 서버 fallback 순으로 시도
        let photo = ''
        const rawP = localStorage.getItem(`${key}_photo`)
        if (rawP) {
          try { photo = JSON.parse(rawP) || '' } catch { photo = rawP }
        }
        if (!photo) photo = saved.dayPhoto || ''
        if (!photo) {
          try {
            const res = await fetch(`/api/store/${encodeURIComponent(`${key}_photo`)}`)
            if (res.ok) {
              const val = await res.json()
              if (typeof val === 'string' && val.startsWith('data:image/')) {
                photo = val
                try { localStorage.setItem(`${key}_photo`, JSON.stringify(photo)) } catch {}
              }
            }
          } catch {}
        }

        if (cancelled) return
        setDayPhoto(photo)
        const d = {}
        const KEYS = ['calories','goal','carbs','carbsGoal','carbsPct','protein','proteinGoal','proteinPct','fat','fatGoal','fatPct','breakfastCal','lunchCal','dinnerCal','snackCal']
        for (const k of KEYS) { if (saved[k] != null) d[k] = saved[k] }
        setData(d)
        setOpen(!!(photo) || !!saved.calories)
      } catch {}
      if (!cancelled) { setScanMsg(''); setSaveState('') }
    }
    load()
    return () => { cancelled = true }
  }, [key])

  function persist(photo, d) {
    try { localStorage.setItem(key, JSON.stringify(d)) } catch (err) { console.warn('[diet] data persist failed', err) }
    if (photo) {
      try { localStorage.setItem(`${key}_photo`, JSON.stringify(photo)) } catch {}
    }
    if (parseFloat(d.protein) >= 95) onProteinCheck?.('hab_protein')
  }

  async function handlePhoto(e) {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''

    let compressed
    try {
      compressed = await compressImg(file)
    } catch (err) {
      setScanMsg(`이미지 처리 실패 — ${err.message}`)
      setShowOcr(true)
      return
    }

    setDayPhoto(compressed)
    setScanning(true)
    setScanMsg('인식 중…')
    setOcrText('')
    setShowOcr(false)

    // OCR 전: 영양 키(key)에는 빈 데이터를 쓰지 않음 — 사진만 별도 키에 저장
    try { localStorage.setItem(`${key}_photo`, JSON.stringify(compressed)) } catch {}
    fetch(`/api/store/${encodeURIComponent(`${key}_photo`)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: compressed }),
    }).catch(() => {})

    try {
      const ctrl = new AbortController()
      const tid = setTimeout(() => ctrl.abort(), 90_000)
      let resp
      try {
        resp = await fetch('/api/ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: compressed }),
          signal: ctrl.signal,
        })
      } finally {
        clearTimeout(tid)
      }
      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}))
        throw new Error(e.error || `서버 오류 ${resp.status}`)
      }
      const { text } = await resp.json()
      setOcrText(text)

      const extracted = extractDayNutrition(text)
      const next = { ...data, ...extracted }
      setData(next)
      persist(compressed, next)
      // 서버에 직접 PUT — syncSet 실패 시 백업 보장
      fetch(`/api/store/${encodeURIComponent(key)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: next }),
      }).catch(() => {})

      if (Object.keys(extracted).length > 0) {
        const parts = []
        if (extracted.calories) parts.push(`${Number(extracted.calories).toLocaleString()}kcal`)
        if (extracted.carbs)    parts.push(`탄 ${extracted.carbs}g`)
        if (extracted.protein)  parts.push(`단 ${extracted.protein}g`)
        if (extracted.fat)      parts.push(`지 ${extracted.fat}g`)
        setScanMsg(`자동 인식 완료 — ${parts.join(' · ')}`)
      } else {
        setScanMsg('수치를 인식하지 못했습니다. OCR 원문을 확인해 주세요')
        setShowOcr(true)
      }
      setSaveState('ready')
    } catch (err) {
      const msg = (err?.name === 'AbortError' || err?.name === 'TimeoutError')
        ? '서버 응답 시간 초과 (90초)'
        : `인식 실패 — ${err?.message || '알 수 없는 오류'}`
      setScanMsg(msg)
      setShowOcr(true)
      setSaveState('ready')
    } finally {
      setScanning(false)
    }
  }

  async function saveNow() {
    setSaveState('saving')
    persist(dayPhoto, data)
    try {
      await fetch(`/api/store/${encodeURIComponent(key)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: data }),
      })
    } catch {}
    if (dayPhoto) {
      try {
        await fetch(`/api/store/${encodeURIComponent(`${key}_photo`)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: dayPhoto }),
        })
      } catch {}
    }
    setSaveState('done')
    setTimeout(() => setSaveState(''), 2500)
  }

  function removePhoto() {
    setDayPhoto('')
    setData({})
    localStorage.removeItem(key)
    localStorage.removeItem(`${key}_photo`)
    setScanMsg('')
    setOcrText('')
  }

  const cal      = parseFloat(data.calories)    || 0
  const goal     = parseFloat(data.goal)        || DEFAULT_GOAL
  const carbs    = parseFloat(data.carbs)       || 0
  const carbsG   = parseFloat(data.carbsGoal)   || 0
  const protein  = parseFloat(data.protein)     || 0
  const proteinG = parseFloat(data.proteinGoal) || 0
  const fat      = parseFloat(data.fat)         || 0
  const fatG     = parseFloat(data.fatGoal)     || 0

  const calPct = Math.min(100, cal > 0 ? (cal / goal) * 100 : 0)

  const macroCal   = { carbs: carbs * 4, protein: protein * 4, fat: fat * 9 }
  const macroTotal = macroCal.carbs + macroCal.protein + macroCal.fat
  const calcPct    = macroTotal > 0
    ? {
        carbs:   macroCal.carbs   / macroTotal * 100,
        protein: macroCal.protein / macroTotal * 100,
        fat:     macroCal.fat     / macroTotal * 100,
      }
    : { carbs: 0, protein: 0, fat: 0 }

  // OCR에서 읽은 % 우선, 없으면 계산값
  const macroPct = {
    carbs:   parseFloat(data.carbsPct)   || calcPct.carbs,
    protein: parseFloat(data.proteinPct) || calcPct.protein,
    fat:     parseFloat(data.fatPct)     || calcPct.fat,
  }

  const MEAL_LABELS = [
    { key: 'breakfastCal', label: '아침' },
    { key: 'lunchCal',     label: '점심' },
    { key: 'dinnerCal',    label: '저녁' },
    { key: 'snackCal',     label: '간식' },
  ]
  const mealRows = MEAL_LABELS.filter(({ key }) => data[key])

  const hasData = cal > 0 || carbs > 0 || protein > 0 || fat > 0

  return (
    <div className="diet-record">
      <button className={`diet-toggle${hasData ? ' has-data' : ''}`} onClick={() => setOpen(v => !v)}>
        <span>🥗 식단 기록</span>
        {hasData && cal > 0 && (
          <span className="diet-summary">
            {Math.round(cal).toLocaleString()}kcal · 단백질 {Math.round(protein)}g
          </span>
        )}
        <span className="diet-arrow">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="diet-body">

          {dayPhoto ? (
            <div className="diet-photo-wrap">
              <img src={dayPhoto} alt="하루 식단" className="diet-photo" />
              <div className="diet-photo-btns">
                <label className="btn btn-ghost btn-sm">
                  <input type="file" accept="image/*" className="photo-input" onChange={handlePhoto} />
                  사진 변경
                </label>
                <button className="btn btn-ghost btn-sm" onClick={removePhoto}>삭제</button>
              </div>
            </div>
          ) : (
            <label className="diet-upload-label">
              <input type="file" accept="image/*" className="photo-input" onChange={handlePhoto} />
              <span className="diet-upload-plus">+</span>
              <span>하루 식단 사진 추가</span>
              <span className="diet-upload-sub">필라이즈 앱 화면 캡처 → 자동 인식</span>
            </label>
          )}

          {scanning && (
            <div className="scan-status scanning">
              <span className="scan-spinner" /><span>{scanMsg}</span>
            </div>
          )}
          {!scanning && scanMsg && (
            <div className={`scan-status ${scanMsg.startsWith('자동') ? 'scan-ok' : 'scan-fail'}`}>
              <span>{scanMsg.startsWith('자동') ? '✓ ' : '⚠ '}{scanMsg}</span>
              {ocrText && (
                <button className="ocr-toggle-btn" onClick={() => setShowOcr(v => !v)}>
                  {showOcr ? '▲ 원문 닫기' : '▼ OCR 원문 보기'}
                </button>
              )}
            </div>
          )}
          {showOcr && (
            ocrText
              ? <pre className="ocr-rawtext">{ocrText}</pre>
              : <div className="ocr-rawtext">원문 없음 — 인식 전에 실패했거나 타임아웃</div>
          )}

          {saveState === 'ready' && (
            <button className="save-btn" onClick={saveNow}>저장하기</button>
          )}
          {saveState === 'saving' && (
            <button className="save-btn saving" disabled>저장 중…</button>
          )}
          {saveState === 'done' && (
            <button className="save-btn done" disabled>✓ 저장됨</button>
          )}

          {hasData && (
            <div className="diet-summary-card">

              {/* 총섭취 1737/1300 */}
              <div className="diet-cal-row">
                <div className="diet-cal-nums">
                  <span className="diet-cal-label-text">총섭취</span>
                  <span className="diet-cal-num">{Math.round(cal)}</span>
                  <span className="diet-cal-slash">/</span>
                  <span className="diet-cal-goal">{Math.round(goal)}</span>
                </div>
                {protein >= 95 && <span className="diet-protein-badge">🎉 단백질 달성</span>}
              </div>

              {/* 칼로리 게이지 바 */}
              <div className="diet-goal-bar-track">
                <div className="diet-goal-bar-fill" style={{ width: `${calPct.toFixed(1)}%` }} />
              </div>

              {/* 탄수화물 21% 92g */}
              {macroTotal > 0 && (
                <div className="diet-macro-rows">
                  {MACROS.map(m => {
                    const g     = m.key === 'carbs' ? carbs : m.key === 'protein' ? protein : fat
                    const gGoal = m.key === 'carbs' ? carbsG : m.key === 'protein' ? proteinG : fatG
                    const barPct = gGoal > 0
                      ? Math.min(100, g / gGoal * 100)
                      : macroPct[m.key]
                    return (
                      <div key={m.key} className="diet-macro-row">
                        <span className="diet-macro-dot" style={{ background: m.color }} />
                        <span className="diet-macro-label">{m.label}</span>
                        <span className="diet-macro-pct" style={{ color: m.color }}>
                          {macroPct[m.key].toFixed(0)}%
                        </span>
                        <div className="diet-macro-bar-track">
                          <div className="diet-macro-bar-fill"
                            style={{ width: `${barPct.toFixed(1)}%`, background: m.color }} />
                        </div>
                        <span className="diet-macro-g">
                          {Math.round(g)}{gGoal > 0 ? `/${Math.round(gGoal)}` : ''}g
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* 끼니별 칼로리 */}
              {mealRows.length > 0 && (
                <div className="diet-meal-cal-row">
                  {mealRows.map(({ key, label }) => (
                    <div key={key} className="diet-meal-cal-chip">
                      <span className="diet-meal-cal-label">{label}</span>
                      <span className="diet-meal-cal-val">{Number(data[key]).toLocaleString()}kcal</span>
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

        </div>
      )}
    </div>
  )
}

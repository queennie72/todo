import { useState, useEffect } from 'react'
import { createWorker } from 'tesseract.js'

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

function extractDayNutrition(text) {
  const t = stripCommas(text)
  const result = {}

  const cal = firstMatch(t, [
    /(?:총|오늘|합계|섭취량?)\s*(?:칼로리|열량)[^\d]{0,30}(\d{3,5})/i,
    /(?:칼로리|열량|에너지)[^\d]{0,50}(\d{3,5})/,
    /(\d{3,5})\s*(?:kcal|㎉|Kcal)/i,
  ])
  const goal = firstMatch(t, [
    /목표[^\d]{0,30}(\d{3,5})/,
    /권장[^\d]{0,30}(\d{3,5})/,
    /기준[^\d]{0,30}(\d{3,5})/,
    /기본[^\d]{0,30}(\d{3,5})/,
  ])
  const carbs = firstMatch(t, [
    /탄수화물[^\d]{0,50}(\d{1,4}(?:\.\d{1,2})?)/,
    /탄\s{0,3}(\d{1,4}(?:\.\d{1,2})?)\s*g/,
  ])
  const protein = firstMatch(t, [
    /단백질[^\d]{0,50}(\d{1,3}(?:\.\d{1,2})?)/,
    /단\s{0,3}(\d{1,3}(?:\.\d{1,2})?)\s*g/,
  ])
  const fat = firstMatch(t, [
    /지방[^\d]{0,50}(\d{1,3}(?:\.\d{1,2})?)/,
    /지\s{0,3}(\d{1,3}(?:\.\d{1,2})?)\s*g/,
  ])

  if (cal)     result.calories = cal
  if (goal)    result.goal     = goal
  if (carbs)   result.carbs    = carbs
  if (protein) result.protein  = protein
  if (fat)     result.fat      = fat
  return result
}

async function compressImg(file) {
  return new Promise(res => {
    const r = new FileReader()
    r.onload = e => {
      const img = new Image()
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
  const [data, setData]       = useState({})   // { calories, goal, carbs, protein, fat }
  const [scanning, setScanning] = useState(false)
  const [scanMsg, setScanMsg] = useState('')
  const [ocrText, setOcrText] = useState('')
  const [showOcr, setShowOcr] = useState(false)

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(key)) || {}
      setDayPhoto(saved.dayPhoto || '')
      const d = {}
      for (const k of ['calories', 'goal', 'carbs', 'protein', 'fat']) {
        if (saved[k] != null) d[k] = saved[k]
      }
      setData(d)
      setOpen(!!saved.dayPhoto || !!saved.calories)
    } catch {}
    setScanMsg('')
  }, [key])

  function persist(photo, d) {
    localStorage.setItem(key, JSON.stringify({ dayPhoto: photo, ...d }))
    if (parseFloat(d.protein) >= 95) onProteinCheck?.('hab_protein')
  }

  async function handlePhoto(e) {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    const compressed = await compressImg(file)
    setDayPhoto(compressed)
    setScanning(true)
    setScanMsg('식단 이미지 인식 중...')
    setOcrText('')
    setShowOcr(false)
    try {
      const worker = await createWorker('kor+eng', 1, {
        logger: m => {
          if (m.status === 'recognizing text')
            setScanMsg(`인식 중 ${Math.round((m.progress || 0) * 100)}%`)
        },
      })
      const { data: { text } } = await worker.recognize(compressed)
      await worker.terminate()
      setOcrText(text)

      const extracted = extractDayNutrition(text)
      const next = { ...data, ...extracted }
      setData(next)
      persist(compressed, next)

      if (Object.keys(extracted).length > 0) {
        const parts = []
        if (extracted.calories) parts.push(`${Number(extracted.calories).toLocaleString()}kcal`)
        if (extracted.carbs)    parts.push(`탄 ${extracted.carbs}g`)
        if (extracted.protein)  parts.push(`단 ${extracted.protein}g`)
        if (extracted.fat)      parts.push(`지 ${extracted.fat}g`)
        setScanMsg(`자동 인식 완료 — ${parts.join(' · ')}`)
      } else {
        setScanMsg('수치를 인식하지 못했습니다. OCR 원문을 확인해 주세요')
      }
    } catch {
      persist(compressed, data)
      setScanMsg('인식 실패')
    }
    setScanning(false)
  }

  function removePhoto() {
    setDayPhoto('')
    setData({})
    localStorage.removeItem(key)
    setScanMsg('')
    setOcrText('')
  }

  const cal     = parseFloat(data.calories) || 0
  const goal    = parseFloat(data.goal)     || DEFAULT_GOAL
  const carbs   = parseFloat(data.carbs)    || 0
  const protein = parseFloat(data.protein)  || 0
  const fat     = parseFloat(data.fat)      || 0

  const calPct = Math.min(100, cal > 0 ? (cal / goal) * 100 : 0)

  const macroCal   = { carbs: carbs * 4, protein: protein * 4, fat: fat * 9 }
  const macroTotal = macroCal.carbs + macroCal.protein + macroCal.fat
  const macroPct   = macroTotal > 0
    ? {
        carbs:   macroCal.carbs   / macroTotal * 100,
        protein: macroCal.protein / macroTotal * 100,
        fat:     macroCal.fat     / macroTotal * 100,
      }
    : { carbs: 0, protein: 0, fat: 0 }

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
          {showOcr && ocrText && (
            <pre className="ocr-rawtext">{ocrText}</pre>
          )}

          {hasData && (
            <div className="diet-summary-card">

              {/* 총 칼로리 vs 목표 */}
              <div className="diet-cal-row">
                <div className="diet-cal-nums">
                  <span className="diet-cal-num">{Math.round(cal).toLocaleString()}</span>
                  <span className="diet-cal-slash"> / </span>
                  <span className="diet-cal-goal">{Math.round(goal).toLocaleString()}</span>
                  <span className="diet-cal-unit"> kcal</span>
                </div>
                {protein >= 95 && <span className="diet-protein-badge">🎉 단백질 달성</span>}
              </div>

              {/* 칼로리 목표 달성 바 */}
              <div className="diet-goal-bar-track">
                <div className="diet-goal-bar-fill" style={{ width: `${calPct.toFixed(1)}%` }} />
              </div>
              <div className="diet-goal-pct-label">{calPct.toFixed(0)}% 섭취</div>

              {/* 탄·단·지 */}
              {macroTotal > 0 && (
                <div className="diet-macro-rows">
                  {MACROS.map(m => {
                    const g = m.key === 'carbs' ? carbs : m.key === 'protein' ? protein : fat
                    const kcal = macroCal[m.key]
                    return (
                      <div key={m.key} className="diet-macro-row">
                        <span className="diet-macro-dot" style={{ background: m.color }} />
                        <span className="diet-macro-label">{m.label}</span>
                        <div className="diet-macro-bar-track">
                          <div className="diet-macro-bar-fill"
                            style={{ width: `${macroPct[m.key].toFixed(1)}%`, background: m.color }} />
                        </div>
                        <span className="diet-macro-g">{Math.round(g)}g</span>
                        <span className="diet-macro-kcal">{Math.round(kcal)}kcal</span>
                        <span className="diet-macro-pct">{macroPct[m.key].toFixed(0)}%</span>
                      </div>
                    )
                  })}
                </div>
              )}

            </div>
          )}

        </div>
      )}
    </div>
  )
}

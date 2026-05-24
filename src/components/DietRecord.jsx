import { useState, useEffect } from 'react'
import { createWorker } from 'tesseract.js'

const MEALS = [
  { id: 'breakfast', label: '아침' },
  { id: 'lunch',     label: '점심' },
  { id: 'dinner',    label: '저녁' },
  { id: 'snack',     label: '간식' },
]

const EMPTY_MEAL = { photo: '', calories: '', carbs: '', protein: '', fat: '' }

const FIELDS = [
  { key: 'calories', label: '칼로리',  unit: 'kcal' },
  { key: 'carbs',    label: '탄수화물', unit: 'g' },
  { key: 'protein',  label: '단백질',  unit: 'g' },
  { key: 'fat',      label: '지방',    unit: 'g' },
]

function parseDietText(text) {
  const t = text.replace(/\r/g, '\n')
  const result = {}
  const calM = t.match(/(?:열량|칼로리)[^\d]{0,15}(\d{2,4})/)
  if (calM) result.calories = calM[1]
  const carbM = t.match(/탄수화물[^\d]{0,15}(\d{1,4}(?:\.\d)?)/)
  if (carbM) result.carbs = carbM[1]
  const protM = t.match(/단백질[^\d]{0,15}(\d{1,3}(?:\.\d)?)/)
  if (protM) result.protein = protM[1]
  const fatM = t.match(/지방[^\d]{0,15}(\d{1,3}(?:\.\d)?)/)
  if (fatM) result.fat = fatM[1]
  return result
}

async function compressImg(file) {
  return new Promise(res => {
    const r = new FileReader()
    r.onload = e => {
      const img = new Image()
      img.onload = () => {
        const MAX = 1200
        let { width: w, height: h } = img
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h * MAX / w); w = MAX }
          else { w = Math.round(w * MAX / h); h = MAX }
        }
        const c = document.createElement('canvas')
        c.width = w; c.height = h
        c.getContext('2d').drawImage(img, 0, 0, w, h)
        res(c.toDataURL('image/jpeg', 0.8))
      }
      img.src = e.target.result
    }
    r.readAsDataURL(file)
  })
}

function calcTotals(data) {
  return MEALS.reduce((acc, m) => {
    const meal = data[m.id]
    if (!meal) return acc
    return {
      calories: acc.calories + (parseFloat(meal.calories) || 0),
      carbs:    acc.carbs    + (parseFloat(meal.carbs)    || 0),
      protein:  acc.protein  + (parseFloat(meal.protein)  || 0),
      fat:      acc.fat      + (parseFloat(meal.fat)      || 0),
    }
  }, { calories: 0, carbs: 0, protein: 0, fat: 0 })
}

export default function DietRecord({ userId, dateStr, onProteinCheck }) {
  const key = `diet_${userId}_${dateStr}`

  const [open, setOpen] = useState(false)
  const [data, setData] = useState(() => {
    try { return JSON.parse(localStorage.getItem(key)) || {} } catch { return {} }
  })
  const [activeMeal, setActiveMeal] = useState('breakfast')
  const [scanning, setScanning] = useState(false)
  const [scanMsg, setScanMsg] = useState('')

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(key)) || {}
      setData(saved)
      const hasAny = MEALS.some(m => {
        const d = saved[m.id]
        return d && (d.photo || d.calories || d.protein)
      })
      setOpen(hasAny)
    } catch {}
    setScanMsg('')
  }, [key])

  function getMeal(mealId) {
    return { ...EMPTY_MEAL, ...(data[mealId] || {}) }
  }

  function updateMeal(mealId, updates) {
    const next = { ...data, [mealId]: { ...getMeal(mealId), ...updates } }
    setData(next)
    localStorage.setItem(key, JSON.stringify(next))
    const totals = calcTotals(next)
    if (totals.protein >= 95) onProteinCheck?.('hab_protein')
  }

  async function handlePhoto(e, mealId) {
    const file = e.target.files[0]
    if (!file) return
    const compressed = await compressImg(file)
    updateMeal(mealId, { photo: compressed })
    setScanMsg('')
    setScanning(true)
    setScanMsg('영양 정보 인식 중...')
    try {
      const worker = await createWorker('kor+eng', 1, {
        logger: m => {
          if (m.status === 'recognizing text')
            setScanMsg(`인식 중 ${Math.round((m.progress || 0) * 100)}%`)
        },
      })
      const { data: { text } } = await worker.recognize(compressed)
      await worker.terminate()
      const extracted = parseDietText(text)
      if (Object.keys(extracted).length > 0) {
        updateMeal(mealId, { photo: compressed, ...extracted })
        setScanMsg('자동 인식 완료 — 수치를 확인해 주세요')
      } else {
        setScanMsg('수치를 인식하지 못했습니다. 직접 입력해 주세요')
      }
    } catch {
      setScanMsg('인식 실패 — 직접 입력해 주세요')
    }
    setScanning(false)
    e.target.value = ''
  }

  const totals = calcTotals(data)
  const hasData = MEALS.some(m => { const d = data[m.id]; return d && (d.calories || d.protein || d.photo) })
  const meal = getMeal(activeMeal)

  return (
    <div className="diet-record">
      <button className={`diet-toggle${hasData ? ' has-data' : ''}`} onClick={() => setOpen(v => !v)}>
        <span>🥗 식단 기록</span>
        {hasData && totals.calories > 0 && (
          <span className="diet-summary">
            {Math.round(totals.calories)}kcal · 단백질 {totals.protein.toFixed(0)}g
          </span>
        )}
        <span className="diet-arrow">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="diet-body">

          {/* 식사 탭 */}
          <div className="diet-tabs">
            {MEALS.map(m => {
              const d = data[m.id]
              const filled = d && (d.calories || d.protein || d.photo)
              return (
                <button
                  key={m.id}
                  className={`diet-tab${activeMeal === m.id ? ' active' : ''}${filled ? ' filled' : ''}`}
                  onClick={() => { setActiveMeal(m.id); setScanMsg('') }}
                >
                  {m.label}
                  {filled && <span className="diet-tab-dot" />}
                </button>
              )
            })}
          </div>

          {/* 사진 */}
          {meal.photo ? (
            <div className="diet-photo-wrap">
              <img src={meal.photo} alt="식사 사진" className="diet-photo" />
              <div className="diet-photo-btns">
                <label className="btn btn-ghost btn-sm">
                  <input type="file" accept="image/*" className="photo-input"
                    onChange={e => handlePhoto(e, activeMeal)} />
                  사진 변경
                </label>
                <button className="btn btn-ghost btn-sm"
                  onClick={() => { updateMeal(activeMeal, { photo: '' }); setScanMsg('') }}>
                  삭제
                </button>
              </div>
            </div>
          ) : (
            <label className="diet-upload-label">
              <input type="file" accept="image/*" className="photo-input"
                onChange={e => handlePhoto(e, activeMeal)} />
              <span className="diet-upload-plus">+</span>
              <span>사진 추가</span>
              <span className="diet-upload-sub">영양 정보 라벨 촬영 시 자동 인식</span>
            </label>
          )}

          {scanning && (
            <div className="scan-status scanning">
              <span className="scan-spinner" /><span>{scanMsg}</span>
            </div>
          )}
          {!scanning && scanMsg && (
            <div className={`scan-status ${scanMsg.startsWith('자동') ? 'scan-ok' : 'scan-fail'}`}>
              {scanMsg.startsWith('자동') ? '✓ ' : '⚠ '}{scanMsg}
            </div>
          )}

          {/* 영양소 입력 */}
          <div className="diet-fields">
            {FIELDS.map(({ key: fk, label, unit }) => (
              <label key={fk} className="diet-field">
                <span className="diet-field-label">{label}</span>
                <div className="diet-input-wrap">
                  <input
                    type="number" step="0.1" min="0"
                    className="diet-input"
                    value={meal[fk]}
                    onChange={e => updateMeal(activeMeal, { [fk]: e.target.value })}
                    placeholder="0"
                  />
                  <span className="diet-unit">{unit}</span>
                </div>
              </label>
            ))}
          </div>

          {/* 오늘 합계 */}
          {hasData && (
            <div className="diet-totals">
              <span className="diet-totals-title">오늘 합계</span>
              <div className="diet-totals-grid">
                {[
                  { label: '칼로리',  val: Math.round(totals.calories), unit: 'kcal', highlight: false },
                  { label: '탄수화물', val: totals.carbs.toFixed(0),    unit: 'g',    highlight: false },
                  { label: '단백질',  val: totals.protein.toFixed(0),   unit: 'g',    highlight: totals.protein >= 95 },
                  { label: '지방',    val: totals.fat.toFixed(0),       unit: 'g',    highlight: false },
                ].map(({ label, val, unit, highlight }) => (
                  <div key={label} className={`diet-total-cell${highlight ? ' protein-ok' : ''}`}>
                    <span className="diet-total-label">{label}</span>
                    <span className="diet-total-val">{val}<span className="diet-total-unit">{unit}</span></span>
                  </div>
                ))}
              </div>
              {totals.protein >= 95 && (
                <div className="diet-protein-badge">🎉 단백질 95g 달성!</div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  )
}

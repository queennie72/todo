import { useState, useEffect } from 'react'
import { createWorker } from 'tesseract.js'

const MEALS = [
  { id: 'breakfast', label: '아침', patterns: [/아침(?:식사|밥)?/i, /breakfast/i] },
  { id: 'lunch',     label: '점심', patterns: [/점심(?:식사|밥)?/i, /lunch/i] },
  { id: 'dinner',    label: '저녁', patterns: [/저녁(?:식사|밥)?/i, /dinner/i, /석식/i] },
  { id: 'snack',     label: '간식', patterns: [/간식|야식/i, /snack/i] },
]

const FIELDS = [
  { key: 'calories', label: '칼로리',  unit: 'kcal' },
  { key: 'carbs',    label: '탄수화물', unit: 'g' },
  { key: 'protein',  label: '단백질',  unit: 'g' },
  { key: 'fat',      label: '지방',    unit: 'g' },
]

const EMPTY_MEAL = { calories: '', carbs: '', protein: '', fat: '' }

function extractNutrition(text) {
  const result = {}
  const calM  = text.match(/(?:열량|칼로리)[^\d]{0,15}(\d{2,4})/)
  const carbM  = text.match(/탄수화물[^\d]{0,15}(\d{1,4}(?:\.\d)?)/)
  const protM  = text.match(/단백질[^\d]{0,15}(\d{1,3}(?:\.\d)?)/)
  const fatM   = text.match(/지방[^\d]{0,15}(\d{1,3}(?:\.\d)?)/)
  if (calM)  result.calories = calM[1]
  if (carbM) result.carbs    = carbM[1]
  if (protM) result.protein  = protM[1]
  if (fatM)  result.fat      = fatM[1]
  return result
}

// 하루 식단 전체 이미지 OCR 텍스트에서 끼니별 섹션을 분리해 파싱
function parseMealPlan(text) {
  const t = text.replace(/\r/g, '\n')

  // 각 끼니 키워드의 첫 등장 위치 찾기
  const found = []
  for (const meal of MEALS) {
    for (const re of meal.patterns) {
      const m = re.exec(t)
      if (m) { found.push({ id: meal.id, start: m.index }); break }
    }
  }

  // 끼니 섹션이 전혀 없으면 null 반환 (호출 측에서 처리)
  if (found.length === 0) return null

  found.sort((a, b) => a.start - b.start)

  const result = {}
  for (let i = 0; i < found.length; i++) {
    const section = t.slice(found[i].start, found[i + 1]?.start ?? t.length)
    const nutrition = extractNutrition(section)
    if (Object.keys(nutrition).length > 0) result[found[i].id] = nutrition
  }
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

function calcTotals(meals) {
  return MEALS.reduce((acc, m) => {
    const d = meals[m.id]
    if (!d) return acc
    return {
      calories: acc.calories + (parseFloat(d.calories) || 0),
      carbs:    acc.carbs    + (parseFloat(d.carbs)    || 0),
      protein:  acc.protein  + (parseFloat(d.protein)  || 0),
      fat:      acc.fat      + (parseFloat(d.fat)      || 0),
    }
  }, { calories: 0, carbs: 0, protein: 0, fat: 0 })
}

export default function DietRecord({ userId, dateStr, onProteinCheck }) {
  const key = `diet_${userId}_${dateStr}`

  const [open, setOpen] = useState(false)
  const [dayPhoto, setDayPhoto] = useState('')
  const [meals, setMeals] = useState({})        // { breakfast: {calories,carbs,protein,fat}, ... }
  const [activeMeal, setActiveMeal] = useState('breakfast')
  const [scanning, setScanning] = useState(false)
  const [scanMsg, setScanMsg] = useState('')

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(key)) || {}
      setDayPhoto(saved.dayPhoto || '')
      const m = {}
      for (const { id } of MEALS) { if (saved[id]) m[id] = saved[id] }
      setMeals(m)
      const hasAny = MEALS.some(({ id }) => {
        const d = saved[id]; return d && (d.calories || d.protein)
      })
      setOpen(hasAny || !!saved.dayPhoto)
    } catch {}
    setScanMsg('')
  }, [key])

  function save(nextPhoto, nextMeals) {
    const data = { dayPhoto: nextPhoto }
    for (const { id } of MEALS) { if (nextMeals[id]) data[id] = nextMeals[id] }
    localStorage.setItem(key, JSON.stringify(data))
    const totals = calcTotals(nextMeals)
    if (totals.protein >= 95) onProteinCheck?.('hab_protein')
  }

  function getMeal(id) {
    return { ...EMPTY_MEAL, ...(meals[id] || {}) }
  }

  function updateField(mealId, field, value) {
    const next = { ...meals, [mealId]: { ...getMeal(mealId), [field]: value } }
    setMeals(next)
    save(dayPhoto, next)
  }

  async function handlePhoto(e) {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    const compressed = await compressImg(file)
    setDayPhoto(compressed)
    save(compressed, meals)
    setScanMsg('')
    setScanning(true)
    setScanMsg('식단 이미지 인식 중...')
    try {
      const worker = await createWorker('kor+eng', 1, {
        logger: m => {
          if (m.status === 'recognizing text')
            setScanMsg(`인식 중 ${Math.round((m.progress || 0) * 100)}%`)
        },
      })
      const { data: { text } } = await worker.recognize(compressed)
      await worker.terminate()

      const parsed = parseMealPlan(text)
      if (parsed && Object.keys(parsed).length > 0) {
        // 인식된 끼니만 병합, 기존 값은 유지
        const next = { ...meals }
        for (const [id, nutrition] of Object.entries(parsed)) {
          next[id] = { ...getMeal(id), ...nutrition }
        }
        setMeals(next)
        save(compressed, next)

        const names = Object.keys(parsed).map(id => MEALS.find(m => m.id === id)?.label).join('·')
        setScanMsg(`자동 인식 완료 (${names}) — 수치를 확인해 주세요`)

        // 인식된 첫 끼니 탭으로 이동
        const firstId = MEALS.find(m => parsed[m.id])?.id
        if (firstId) setActiveMeal(firstId)
      } else {
        // 끼니 구분 없이 전체에서 수치만 추출
        const global = extractNutrition(text)
        if (Object.keys(global).length > 0) {
          setScanMsg('끼니 구분을 찾지 못했습니다. 수동으로 탭별 입력해 주세요')
        } else {
          setScanMsg('수치를 인식하지 못했습니다. 직접 입력해 주세요')
        }
      }
    } catch {
      setScanMsg('인식 실패 — 직접 입력해 주세요')
    }
    setScanning(false)
  }

  function removePhoto() {
    setDayPhoto('')
    save('', meals)
    setScanMsg('')
  }

  const totals = calcTotals(meals)
  const hasData = MEALS.some(({ id }) => { const d = meals[id]; return d && (d.calories || d.protein) })
  const meal = getMeal(activeMeal)

  // 탄수화물·단백질·지방 → 칼로리 환산 비율 (4/4/9 kcal/g)
  const macroCal = {
    carbs:   (parseFloat(totals.carbs)   || 0) * 4,
    protein: (parseFloat(totals.protein) || 0) * 4,
    fat:     (parseFloat(totals.fat)     || 0) * 9,
  }
  const macroTotal = macroCal.carbs + macroCal.protein + macroCal.fat
  const macroPct = macroTotal > 0
    ? { carbs: macroCal.carbs / macroTotal * 100, protein: macroCal.protein / macroTotal * 100, fat: macroCal.fat / macroTotal * 100 }
    : { carbs: 0, protein: 0, fat: 0 }
  const MACROS = [
    { key: 'carbs',   label: '탄수화물', short: '탄', color: '#818cf8', g: totals.carbs.toFixed(0) },
    { key: 'protein', label: '단백질',   short: '단', color: '#34d399', g: totals.protein.toFixed(0) },
    { key: 'fat',     label: '지방',     short: '지', color: '#fb923c', g: totals.fat.toFixed(0) },
  ]
  const maxMealCal = Math.max(...MEALS.map(m => parseFloat(meals[m.id]?.calories) || 0), 1)

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

          {/* 하루 식단 사진 (단일) */}
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
              <span className="diet-upload-sub">아침·점심·저녁·간식 정보가 담긴 이미지 → 자동 인식</span>
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

          {/* 끼니 탭 */}
          <div className="diet-tabs">
            {MEALS.map(m => {
              const d = meals[m.id]
              const filled = d && (d.calories || d.protein)
              return (
                <button
                  key={m.id}
                  className={`diet-tab${activeMeal === m.id ? ' active' : ''}${filled ? ' filled' : ''}`}
                  onClick={() => setActiveMeal(m.id)}
                >
                  {m.label}
                  {filled && <span className="diet-tab-dot" />}
                </button>
              )
            })}
          </div>

          {/* 끼니별 수치 입력 */}
          <div className="diet-fields">
            {FIELDS.map(({ key: fk, label, unit }) => (
              <label key={fk} className="diet-field">
                <span className="diet-field-label">{label}</span>
                <div className="diet-input-wrap">
                  <input
                    type="number" step="0.1" min="0"
                    className="diet-input"
                    value={meal[fk]}
                    onChange={e => updateField(activeMeal, fk, e.target.value)}
                    placeholder="0"
                  />
                  <span className="diet-unit">{unit}</span>
                </div>
              </label>
            ))}
          </div>

          {/* 오늘 합계 카드 */}
          {hasData && (
            <div className="diet-summary-card">

              {/* 총 칼로리 */}
              <div className="diet-cal-row">
                <div>
                  <span className="diet-cal-num">{Math.round(totals.calories).toLocaleString()}</span>
                  <span className="diet-cal-unit">kcal 먹었어요</span>
                </div>
                {totals.protein >= 95 && (
                  <span className="diet-protein-badge">🎉 단백질 달성</span>
                )}
              </div>

              {/* 탄·단·지 행 */}
              {macroTotal > 0 && (
                <div className="diet-macro-rows">
                  {MACROS.map(m => (
                    <div key={m.key} className="diet-macro-row">
                      <span className="diet-macro-dot" style={{ background: m.color }} />
                      <span className="diet-macro-short">{m.short}</span>
                      <div className="diet-macro-bar-track">
                        <div className="diet-macro-bar-fill"
                          style={{ width: `${macroPct[m.key].toFixed(1)}%`, background: m.color }} />
                      </div>
                      <span className="diet-macro-g">{m.g}g</span>
                      <span className="diet-macro-pct">{macroPct[m.key].toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              )}

              {/* 끼니별 사진 + 칼로리 */}
              <div className="diet-meal-cards">
                {MEALS.map(m => {
                  const cal = parseFloat(meals[m.id]?.calories) || 0
                  const photo = meals[m.id]?.photo || ''
                  if (!cal && !photo) return null
                  return (
                    <div key={m.id} className="diet-meal-card">
                      {photo
                        ? <img src={photo} alt={m.label} className="diet-meal-thumb" />
                        : <div className="diet-meal-thumb-empty" />
                      }
                      <span className="diet-meal-card-label">{m.label}</span>
                      <span className="diet-meal-card-cal">{Math.round(cal)}<span className="diet-meal-card-unit">kcal</span></span>
                    </div>
                  )
                })}
              </div>

            </div>
          )}

        </div>
      )}
    </div>
  )
}

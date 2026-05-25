import { useState, useEffect } from 'react'

const BASELINE = '2026-05-09'

function parseInbodyText(text) {
  const t = text.replace(/\r/g, '\n')
  const result = {}

  // 체중: 40~199 범위 숫자
  const wm = t.match(/체중\D{0,20}?(\d{2,3}(?:\.\d)?)/)
  if (wm) result.weight = wm[1]

  // 골격근량 (InBody 공식 용어) 또는 근육량
  const mm = t.match(/골격근량\D{0,20}?(\d{1,3}(?:\.\d)?)/) ||
             t.match(/근육량\D{0,20}?(\d{1,3}(?:\.\d)?)/)
  if (mm) result.muscle = mm[1]

  // 체지방량 또는 체지방
  const fm = t.match(/체지방량\D{0,20}?(\d{1,3}(?:\.\d)?)/) ||
             t.match(/체지방\s{0,5}(\d{1,3}(?:\.\d)?)/)
  if (fm) result.fat = fm[1]

  return result
}

function loadLS(key) {
  try { return JSON.parse(localStorage.getItem(key)) } catch { return null }
}

function saveLS(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch {}
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

function diff(a, b) {
  if (a === '' || a == null || b === '' || b == null) return null
  return parseFloat(a) - parseFloat(b)
}

function DeltaTag({ d, unit = '', goodDir = 'down' }) {
  if (d === null) return null
  const abs = Math.abs(d).toFixed(1)
  const sign = d > 0 ? '+' : d < 0 ? '-' : ''
  const isGood = d === 0 ? null : (goodDir === 'down' ? d < 0 : d > 0)
  const cls = d === 0 ? 'delta-neutral' : isGood ? 'delta-good' : 'delta-bad'
  const arrow = d > 0 ? '▲' : d < 0 ? '▼' : '─'
  return <span className={`delta-tag ${cls}`}>{arrow} {sign}{abs}{unit}</span>
}

const EMPTY_IB = { photo: '', weight: '', muscle: '', fat: '' }

export default function HealthRecord({ userId, dateStr, onHealthCheck }) {
  const ibKey = `inbody_${userId}_${dateStr}`
  const bsKey = `bloodsugar_${userId}_${dateStr}`

  const [ib, setIb] = useState(() => loadLS(ibKey) || EMPTY_IB)
  const [bs, setBs] = useState(() => {
    const v = loadLS(bsKey); return v != null ? String(v) : ''
  })
  const [showFields, setShowFields] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanMsg, setScanMsg] = useState('')
  const [saveState, setSaveState] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      const savedIb = loadLS(ibKey) || EMPTY_IB

      // 사진: ib 내장 → 별도 키 → 서버 fallback
      if (!savedIb.photo) {
        const rawP = localStorage.getItem(`${ibKey}_photo`)
        if (rawP) {
          try { savedIb.photo = JSON.parse(rawP) || '' } catch { savedIb.photo = rawP }
        }
      }
      if (!savedIb.photo) {
        try {
          const res = await fetch(`/api/store/${encodeURIComponent(`${ibKey}_photo`)}`)
          if (res.ok) {
            const val = await res.json()
            if (typeof val === 'string' && val.startsWith('data:image/')) {
              savedIb.photo = val
              try { localStorage.setItem(`${ibKey}_photo`, JSON.stringify(val)) } catch {}
            }
          }
        } catch {}
      }

      if (cancelled) return
      const savedBs = loadLS(bsKey)
      setIb(savedIb)
      setBs(savedBs != null ? String(savedBs) : '')
      setShowFields(!!(savedIb.weight))
      setScanMsg('')
      setSaveState('')
    }
    load()
    return () => { cancelled = true }
  }, [ibKey, bsKey])

  function updateIb(field, value) {
    const next = { ...ib, [field]: value }
    setIb(next)
    saveLS(ibKey, next)
    if (next.weight || next.muscle || next.fat) onHealthCheck?.('hab_inbody')
  }

  function updateBs(value) {
    setBs(value)
    if (value !== '') {
      saveLS(bsKey, parseFloat(value))
      onHealthCheck?.('hab_blood')
    } else {
      localStorage.removeItem(bsKey)
    }
  }

  async function handleInbodyPhoto(e) {
    const file = e.target.files[0]
    if (!file) return
    const compressed = await compressImg(file)
    const photoState = { ...ib, photo: compressed }
    setIb(photoState)
    setShowFields(true)
    setScanning(true)
    setScanMsg('인식 중…')
    try { saveLS(ibKey, photoState) } catch (err) { console.warn('[health] saveLS failed', err) }
    try { localStorage.setItem(`${ibKey}_photo`, JSON.stringify(compressed)) } catch {}
    fetch(`/api/store/${encodeURIComponent(`${ibKey}_photo`)}`, {
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
      const extracted = parseInbodyText(text)
      if (extracted.weight || extracted.muscle || extracted.fat) {
        const updated = { ...photoState, ...extracted }
        setIb(updated)
        saveLS(ibKey, updated)
        onHealthCheck?.('hab_inbody')
        setScanMsg('자동 인식 완료 — 수치를 확인해 주세요')
      } else {
        setScanMsg('수치를 인식하지 못했습니다. 직접 입력해 주세요')
      }
      setSaveState('ready')
    } catch (err) {
      setScanMsg(`인식 실패 — ${err?.message || '직접 입력해 주세요'}`)
      setSaveState('ready')
    }
    setScanning(false)
  }

  async function saveNow() {
    setSaveState('saving')
    const noPhoto = { ...ib, photo: '' }
    saveLS(ibKey, ib)
    try {
      await fetch(`/api/store/${encodeURIComponent(ibKey)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: noPhoto }),
      })
    } catch {}
    if (ib.photo) {
      try { localStorage.setItem(`${ibKey}_photo`, JSON.stringify(ib.photo)) } catch {}
      try {
        await fetch(`/api/store/${encodeURIComponent(`${ibKey}_photo`)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: ib.photo }),
        })
      } catch {}
    }
    setSaveState('done')
    setTimeout(() => setSaveState(''), 2500)
  }

  function removeInbodyPhoto() {
    const next = { ...ib, photo: '' }
    setIb(next)
    saveLS(ibKey, next)
    localStorage.removeItem(`${ibKey}_photo`)
    fetch(`/api/store/${encodeURIComponent(`${ibKey}_photo`)}`, { method: 'DELETE' }).catch(() => {})
  }

  const fatPct = ib.weight && ib.fat
    ? (parseFloat(ib.fat) / parseFloat(ib.weight)) * 100
    : null

  const bl = loadLS(`inbody_${userId}_${BASELINE}`) || {}
  const blFatPct = bl.weight && bl.fat
    ? (parseFloat(bl.fat) / parseFloat(bl.weight)) * 100
    : null
  const blBs = loadLS(`bloodsugar_${userId}_${BASELINE}`)

  const isBaseline = dateStr === BASELINE
  const hasBaselineData = bl.weight || blBs != null

  const bsNum = parseFloat(bs)
  const bsStatus = bs ? (bsNum < 100 ? { label: '정상', cls: 'bs-normal' } : bsNum < 126 ? { label: '주의', cls: 'bs-warn' } : { label: '높음', cls: 'bs-high' }) : null

  return (
    <section className="section health-section">
      <div className="section-header">
        <span className="section-title">건강 기록</span>
        {isBaseline && <span className="baseline-tag">5/9 기준일</span>}
      </div>

      {/* 인바디 */}
      <div className="health-block">
        <div className="health-block-title" style={{ color: '#3b82f6' }}>인바디</div>

        {ib.photo ? (
          <div className="inbody-photo-wrap">
            <img src={ib.photo} alt="인바디 결과" className="inbody-photo" />
            <div className="inbody-photo-btns">
              <button className="btn btn-ghost btn-sm" onClick={() => setShowFields(s => !s)}>
                {showFields ? '수치 접기' : '수치 입력'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={removeInbodyPhoto}>
                사진 삭제
              </button>
            </div>
            {scanning && (
              <div className="scan-status scanning">
                <span className="scan-spinner" />
                <span>{scanMsg}</span>
              </div>
            )}
            {!scanning && scanMsg && (
              <div className={`scan-status ${scanMsg.startsWith('자동 인식') ? 'scan-ok' : 'scan-fail'}`}>
                {scanMsg.startsWith('자동 인식') ? '✓ ' : '⚠ '}{scanMsg}
              </div>
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
          </div>
        ) : (
          <label className="health-upload-label">
            <input type="file" accept="image/*" className="photo-input" onChange={handleInbodyPhoto} />
            <span className="health-upload-plus">+</span>
            <span className="health-upload-text">인바디 결과 사진 업로드</span>
            <span className="health-upload-sub">업로드하면 체중·근육·체지방을 자동 인식합니다</span>
          </label>
        )}

        {showFields && (
          <div className="inbody-fields">
            <div className="inbody-row">
              {[
                { key: 'weight', label: '체중', unit: 'kg' },
                { key: 'muscle', label: '근육량', unit: 'kg' },
                { key: 'fat', label: '체지방', unit: 'kg' },
              ].map(({ key, label, unit }) => (
                <label key={key} className="inbody-field">
                  <span className="inbody-field-label">{label}</span>
                  <div className="inbody-input-wrap">
                    <input
                      type="number" step="0.1" min="0" className="inbody-input"
                      value={ib[key]}
                      onChange={e => updateIb(key, e.target.value)}
                      placeholder="0.0"
                    />
                    <span className="inbody-unit">{unit}</span>
                  </div>
                </label>
              ))}
            </div>

            {fatPct !== null && (
              <div className="inbody-fatpct-row">
                <span>체지방률</span>
                <strong className="inbody-fatpct-val">{fatPct.toFixed(1)}%</strong>
                {blFatPct !== null && !isBaseline && (
                  <DeltaTag d={diff(fatPct, blFatPct)} unit="%" goodDir="down" />
                )}
              </div>
            )}

            {!ib.photo && (
              <label className="health-upload-label small">
                <input type="file" accept="image/*" className="photo-input" onChange={handleInbodyPhoto} />
                사진도 함께 올리기
              </label>
            )}
          </div>
        )}

        {!showFields && !ib.photo && (
          <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setShowFields(true)}>
            수치만 입력
          </button>
        )}
      </div>

      {/* 공복혈당 */}
      <div className="health-block">
        <div className="health-block-title" style={{ color: '#22c55e' }}>공복혈당</div>
        <div className="bs-row">
          <input
            type="number" className="bs-input"
            value={bs} onChange={e => updateBs(e.target.value)}
            placeholder="수치 입력"
            min="0" max="500"
          />
          <span className="bs-unit">mg/dL</span>
          {bsStatus && <span className={`bs-status ${bsStatus.cls}`}>{bsStatus.label}</span>}
          {blBs != null && bs && !isBaseline && (
            <DeltaTag d={diff(bs, blBs)} unit="" goodDir="down" />
          )}
        </div>
      </div>

      {/* 5/9 기준 비교 */}
      {!isBaseline && hasBaselineData && (
        <div className="health-compare">
          <div className="compare-title">5/9 기준 비교</div>
          <div className="compare-rows">
            {bl.weight && ib.weight ? (
              <div className="compare-row">
                <span className="compare-label">체중</span>
                <span className="compare-vals">{bl.weight} → <b>{ib.weight}</b> kg</span>
                <DeltaTag d={diff(ib.weight, bl.weight)} unit="kg" goodDir="down" />
              </div>
            ) : null}
            {bl.muscle && ib.muscle ? (
              <div className="compare-row">
                <span className="compare-label">근육량</span>
                <span className="compare-vals">{bl.muscle} → <b>{ib.muscle}</b> kg</span>
                <DeltaTag d={diff(ib.muscle, bl.muscle)} unit="kg" goodDir="up" />
              </div>
            ) : null}
            {bl.fat && ib.fat ? (
              <div className="compare-row">
                <span className="compare-label">체지방</span>
                <span className="compare-vals">{bl.fat} → <b>{ib.fat}</b> kg</span>
                <DeltaTag d={diff(ib.fat, bl.fat)} unit="kg" goodDir="down" />
              </div>
            ) : null}
            {blFatPct !== null && fatPct !== null ? (
              <div className="compare-row">
                <span className="compare-label">체지방률</span>
                <span className="compare-vals">{blFatPct.toFixed(1)} → <b>{fatPct.toFixed(1)}</b> %</span>
                <DeltaTag d={diff(fatPct, blFatPct)} unit="%" goodDir="down" />
              </div>
            ) : null}
            {blBs != null && bs ? (
              <div className="compare-row">
                <span className="compare-label">공복혈당</span>
                <span className="compare-vals">{blBs} → <b>{bs}</b> mg/dL</span>
                <DeltaTag d={diff(bs, blBs)} unit="" goodDir="down" />
              </div>
            ) : null}
            {!ib.weight && !bs && (
              <p className="compare-empty">오늘 측정값을 입력하면 비교가 표시됩니다</p>
            )}
          </div>
        </div>
      )}

      {isBaseline && (
        <p className="baseline-hint">이 날짜의 수치가 비교 기준점(5/9)으로 사용됩니다</p>
      )}
    </section>
  )
}

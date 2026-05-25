const http = require('http')
const express = require('express')
const fs = require('fs')
const path = require('path')
const os = require('os')
const { createWorker } = require('tesseract.js')

const app = express()
const PORT = 3001
const DATA_FILE = path.join(__dirname, 'data', 'store.json')
const DIST = path.join(__dirname, 'dist')

// ── 미들웨어 ──────────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})
app.use(express.json({ limit: '100mb' }))

// ── 데이터 헬퍼 ───────────────────────────────────────────────
function loadData() {
  try {
    if (!fs.existsSync(DATA_FILE)) return {}
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
  } catch { return {} }
}

function saveData(data) {
  const dir = path.dirname(DATA_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8')
}

// ── API ────────────────────────────────────────────────────────
// 전체 조회 (앱 초기 로딩 시 한 번에 가져오기)
app.get('/api/store', (req, res) => {
  res.json(loadData())
})

// 단일 키 조회
app.get('/api/store/:key', (req, res) => {
  const data = loadData()
  const key = decodeURIComponent(req.params.key)
  res.json(key in data ? data[key] : null)
})

// 단일 키 저장
app.put('/api/store/:key', (req, res) => {
  const data = loadData()
  const key = decodeURIComponent(req.params.key)
  data[key] = req.body.value
  saveData(data)
  res.json({ ok: true })
})

// 단일 키 삭제
app.delete('/api/store/:key', (req, res) => {
  const data = loadData()
  const key = decodeURIComponent(req.params.key)
  delete data[key]
  saveData(data)
  res.json({ ok: true })
})

// 여러 키 한 번에 저장 (localStorage 전체 업로드용)
app.post('/api/store/bulk', (req, res) => {
  const data = loadData()
  const incoming = req.body
  for (const [key, value] of Object.entries(incoming)) {
    data[key] = value
  }
  saveData(data)
  res.json({ ok: true, count: Object.keys(incoming).length })
})

// ── OCR ────────────────────────────────────────────────────────
const TESSDATA = path.join(__dirname, 'dist', 'tessdata')

app.post('/api/ocr', async (req, res) => {
  const { image } = req.body
  console.log('[OCR] request received, image length:', image?.length ?? 'none')
  if (!image) return res.status(400).json({ error: 'image required' })

  let worker
  try {
    worker = await createWorker('kor+eng', 1, {
      langPath: TESSDATA,
      gzip: true,
      errorHandler: err => console.error('[tesseract]', err),
    })
    const { data: { text } } = await worker.recognize(image)
    res.json({ text })
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: err?.message || String(err) })
  } finally {
    if (worker) worker.terminate().catch(() => {})
  }
})

// ── 정적 파일 (빌드된 앱) ────────────────────────────────────
// /todo/ 경로로 서빙 (GitHub Pages와 동일한 경로)
if (fs.existsSync(DIST)) {
  app.use('/todo', express.static(DIST, {
    setHeaders(res, filePath) {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
        res.setHeader('Pragma', 'no-cache')
        res.setHeader('Expires', '0')
      }
    },
  }))
  app.get(/^\/todo(\/.*)?$/, (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    res.sendFile(path.join(DIST, 'index.html'))
  })
}
app.get('/', (req, res) => res.redirect('/todo/'))

// ── 서버 시작 ─────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  // 로컬 네트워크 IP 찾기
  const nets = os.networkInterfaces()
  let localIp = 'localhost'
  for (const iface of Object.values(nets)) {
    for (const net of iface) {
      if (net.family === 'IPv4' && !net.internal) {
        localIp = net.address
        break
      }
    }
  }

  console.log('\n═══════════════════════════════════════')
  console.log('  퀴니의 두잉두잉 — 데이터 서버 실행 중')
  console.log('═══════════════════════════════════════')
  console.log(`  PC 접속:     http://localhost:${PORT}/todo/`)
  console.log(`  핸드폰 접속: http://${localIp}:${PORT}/todo/`)
  console.log(`  데이터 파일: ${DATA_FILE}`)
  console.log('═══════════════════════════════════════\n')
})

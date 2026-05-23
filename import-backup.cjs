const fs = require('fs')
const path = require('path')

const backupFile = path.join(__dirname, 'quinni-backup.json')

if (!fs.existsSync(backupFile)) {
  console.log('quinni-backup.json 파일이 C:\\claude\\ 폴더에 없습니다.')
  console.log('Chrome DevTools 콘솔 스크립트를 먼저 실행해서 파일을 다운로드하세요.')
  process.exit(1)
}

const data = JSON.parse(fs.readFileSync(backupFile, 'utf8'))
const keys = Object.keys(data)
console.log(`\n백업 파일 항목 수: ${keys.length}개`)
keys.forEach(k => {
  const size = JSON.stringify(data[k]).length
  console.log(`  ${k}  (${size > 1000 ? Math.round(size/1024)+'KB' : size+'B'})`)
})

// 서버에 업로드
fetch('http://localhost:3001/api/store/bulk', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
})
.then(r => r.json())
.then(result => {
  console.log(`\n✓ 서버 업로드 완료: ${result.count}개 항목`)
  console.log('\n이제 핸드폰에서 아래 주소로 접속하면 모든 데이터가 보입니다:')
  console.log('  http://172.30.1.69:3001/todo/')
})
.catch(e => console.error('업로드 실패:', e.message))

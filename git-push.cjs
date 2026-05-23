const git = require('isomorphic-git')
const http = require('isomorphic-git/http/node')
const fs = require('fs')

const DIR = __dirname
const REMOTE = 'https://github.com/queennie72/todo.git'
const BRANCH = 'main'
const TOKEN = process.env.GH_TOKEN || process.argv[2]

if (!TOKEN) {
  console.error('토큰 없음. 환경변수 GH_TOKEN 또는 인수로 전달하세요.')
  process.exit(1)
}

const AUTH = { onAuth: () => ({ username: 'token', password: TOKEN }) }

async function run() {
  // remote 설정
  const remotes = await git.listRemotes({ fs, dir: DIR })
  if (!remotes.find(r => r.remote === 'origin')) {
    await git.addRemote({ fs, dir: DIR, remote: 'origin', url: REMOTE })
    console.log('remote origin 추가')
  }

  // 원격 최신 상태 fetch
  console.log('원격 저장소 fetch 중...')
  await git.fetch({ fs, http, dir: DIR, remote: 'origin', ref: BRANCH, ...AUTH, singleBranch: true })
  console.log('fetch 완료')

  // 원격 HEAD를 기준으로 로컬 브랜치 설정
  const remoteCommit = await git.resolveRef({ fs, dir: DIR, ref: `refs/remotes/origin/${BRANCH}` })
  console.log('원격 HEAD:', remoteCommit.slice(0, 7))

  // 현재 로컬 HEAD 확인
  let localHead
  try {
    localHead = await git.resolveRef({ fs, dir: DIR, ref: 'HEAD' })
  } catch {
    localHead = null
  }

  // 로컬 브랜치를 원격 기준으로 리셋
  await git.writeRef({ fs, dir: DIR, ref: `refs/heads/${BRANCH}`, value: remoteCommit, force: true })
  // HEAD 파일을 직접 써서 symbolic ref 설정
  fs.writeFileSync(`${DIR}/.git/HEAD`, `ref: refs/heads/${BRANCH}\n`)

  // 변경된 파일 스테이징
  const statusMatrix = await git.statusMatrix({ fs, dir: DIR })
  let staged = 0
  for (const [filepath, head, workdir, stage] of statusMatrix) {
    if (workdir !== stage || head !== workdir) {
      if (workdir === 0) {
        await git.remove({ fs, dir: DIR, filepath })
      } else {
        await git.add({ fs, dir: DIR, filepath })
      }
      staged++
    }
  }
  console.log(`스테이징: ${staged}개 파일`)

  if (staged === 0) {
    // 변경 없어도 강제 커밋
    await git.add({ fs, dir: DIR, filepath: 'src/lib/storage.js' })
  }

  // 커밋
  const sha = await git.commit({
    fs,
    dir: DIR,
    message: `업데이트 ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`,
    author: { name: 'queennie72', email: 'queennie72@gmail.com' },
  })
  console.log('커밋:', sha.slice(0, 7))

  // push
  console.log('푸쉬 중...')
  await git.push({ fs, http, dir: DIR, remote: 'origin', ref: BRANCH, ...AUTH })
  console.log('✓ GitHub 푸쉬 완료')
  console.log('  https://queennie72.github.io/todo/')
}

run().catch(e => {
  console.error('실패:', e.message)
  process.exit(1)
})

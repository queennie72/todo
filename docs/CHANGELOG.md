# Doing Doing — 변경 이력

---

## [2026-05-23] 세션 작업 내용

### 1. 데이터 마이그레이션 — 두 유저 ID 통합

**배경**  
GitHub Pages 배포본과 로컬 서버 개발 중에 같은 이메일로 두 개의 유저 ID가 생성되어 데이터가 분리됨.

- GitHub Pages ID: `191a827f-...`
- 로컬 서버 ID: `8079f7c1-...`

**조치**  
GitHub Pages 백업 데이터를 로컬 서버에 임포트하고, `auth_users`의 ID를 GitHub Pages 기준으로 덮어씀. 구 로컬 ID로 저장된 키는 삭제.

---

### 2. `storage.js` — 정크 키 자동 정리

**파일**: `src/lib/storage.js`

**문제**  
이전 버그로 인해 `localStorage`에 `setItem`, `removeItem` 라는 키가 실제 데이터처럼 저장되어 서버(`store.json`)로 업로드됨.

**변경**  
`JUNK_KEYS` 집합을 정의하고 `initStorage()` 실행 시 자동 감지·삭제.

```js
const JUNK_KEYS = new Set(['setItem', 'removeItem'])

// initStorage 내부
for (const k of JUNK_KEYS) {
  if (k in serverData) syncDelete(k)
  if (localStorage.getItem(k) !== null) _removeItem.call(localStorage, k)
}
```

---

### 3. 러닝 기록 기능 추가

**파일**: `src/App.jsx`, `src/App.css`

**기능**  
"운동" 루틴 그룹 하단에 러닝 기록 입력 UI 추가.

| 항목 | 내용 |
|------|------|
| 입력 | 거리(km), 시간(시·분), 한 줄 메모 |
| 저장 키 | `running_${userId}_${dateStr}` |
| 표시 | 해당 월 누적 / 해당 연도 누적 (km + 시간) |

**추가 함수**
- `calcRunningTotals(userId, dateStr)` — localStorage 전체 스캔으로 월간·연간 합산
- `fmtDist(km)` — km 포맷 (예: `12.5km`)
- `fmtTime(mins)` — 시간 포맷 (예: `1시간 30분`)

---

### 4. 날짜 이동 버튼 (TodoApp 헤더)

**파일**: `src/App.jsx`, `src/App.css`

**기능**  
TodoApp 헤더에 `‹` / `›` 버튼을 추가하여 전날·다음날로 이동.

```
‹  2026년 5월 23일 (금)  ›        user@email.com  로그아웃
```

**추가 함수**  
`shiftDate(dateStr, delta)` — `YYYY-MM-DD` 문자열에 delta일을 더한 날짜 반환.

---

### 5. 건강측정 그래프 팝업 (월간 리뷰)

**파일**: `src/components/MonthlyReview.jsx`, `src/App.css`

**기능**  
월간 리뷰의 "건강측정" 섹션에서 "인바디 측정" / "공복혈당 측정" 버튼 클릭 시 해당 월 추이 그래프 팝업 표시.

**구현**
- `HealthChart` — SVG 기반 라인 차트 (외부 라이브러리 없음)
  - X축: 날짜별 점, Y축: 측정값 (min~max 범위 자동 스케일)
  - 데이터 없는 날짜 제외, 측정값은 `health_${userId}_${dateStr}` 키의 `inbody` / `bloodSugar` 필드
- `HealthChartPopup` — 그래프를 감싸는 모달 팝업

---

### 6. 날짜 클릭 DayPopup (월간 리뷰)

**파일**: `src/components/MonthlyReview.jsx`, `src/App.css`

**기능**  
월간 리뷰에서 날짜를 클릭하면 해당 날짜의 상세 데이터를 입력할 수 있는 바텀시트 팝업 표시.

**팝업 표시 항목**
- 완료된 할일 목록
- 루틴 체크 현황
- 감정 이모지
- 하루 메모

**구현 패턴**  
`DayPopup` 컴포넌트 — `position: fixed`, 아래서 슬라이드업 방식.

---

### 7. 이달의 사진 — 날짜 클릭 사진 관리

**파일**: `src/components/MonthlyReview.jsx`, `src/App.css`

**기능**  
월간 리뷰 "이달의 사진" 달력에서 날짜 클릭 시 팝업으로 사진 추가·변경·삭제.

| 상태 | UI |
|------|----|
| 사진 없음 | `+ 사진 추가` 업로드 라벨 |
| 사진 있음 | 사진 미리보기 + `사진 변경` + `삭제` 버튼 |

**썸네일 갱신 문제 해결**  
`getDayPhoto()`가 렌더 타임에 localStorage를 읽는 순수 함수라 상태 변경 시 자동 갱신이 안 됨.  
`refresh` 카운터 상태를 추가하고 업로드/삭제 시 `setRefresh(v => v+1)` 호출, 그리드 렌더 루프에서 `void refresh`로 의존성 강제 설정.

```jsx
const [refresh, setRefresh] = useState(0)
// 그리드 내부
void refresh  // refresh 변경 시 이 셀도 리렌더
const photo = getDayPhoto(userId, dateStr)
```

---

### 8. 앱 이름 변경 — "Doing Doing"

**파일**: `index.html`, `src/App.jsx`, `src/App.css`

**변경 내용**
- 브라우저 탭 타이틀: `Doing Doing`
- Google Fonts Pacifico 추가
- 메인 화면(CalendarView) 최상단에 앱 타이틀 표시

```css
.app-title {
  font-family: 'Pacifico', cursive;
  font-size: 2.6rem;
  background: linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

---

### 9. iOS 사진 선택 버그 수정

**파일**: `src/components/MonthlyReview.jsx`

**문제**  
`<label>` 태그에 `onClick={e => e.stopPropagation()}`을 적용했더니 iOS Safari에서 label → input[type=file] 연결이 끊겨 파일 선택 불가.

**원인**  
iOS Safari는 label 클릭 이벤트에 stopPropagation이 있으면 연결된 input으로 이벤트를 전달하지 않음.

**수정**  
label의 `stopPropagation` 제거. 오버레이 닫힘 방지는 `photo-lightbox-inner` div의 `stopPropagation`으로 충분.

```jsx
// Before (broken on iOS)
<label ... onClick={e => e.stopPropagation()}>

// After (fixed)
<label ...>  {/* stopPropagation 제거 */}
```

---

### 10. git-push.cjs — 안정적 push 스크립트

**파일**: `git-push.cjs`

`isomorphic-git`을 사용한 Node.js 기반 push 스크립트 (시스템 PATH에 git 없는 Windows 환경 대응).

**핵심 전략**
1. 원격 fetch → 로컬 브랜치를 원격 HEAD로 리셋
2. 변경 파일 스테이징 → 커밋
3. push (non-force)

**해결한 오류들**

| 오류 | 원인 | 해결 |
|------|------|------|
| 401 Unauthorized | 토큰 이중 입력 | 토큰 1회 입력 |
| not a fast-forward | 로컬이 원격보다 뒤처짐 | fetch-first 전략 |
| repository rule violations | 브랜치 보호 + force push | fetch-first + non-force push |
| ENOENT `.git/ref: refs/...` | Windows 경로 문자 오류 | `fs.writeFileSync('.git/HEAD', ...)` 직접 쓰기 |

---

## 현재 localStorage 키 전체 목록

| 키 패턴 | 타입 | 설명 |
|---------|------|------|
| `auth_users` | `Record<email, StoredUser>` | 전체 유저 목록 |
| `auth_session` | `{ id, email }` | 현재 로그인 세션 |
| `todos_${userId}_${dateStr}` | `Todo[]` | 날짜별 할일 |
| `habits_${userId}_${dateStr}` | `boolean[10]` | 날짜별 루틴 완료 상태 |
| `emoji_${userId}_${dateStr}` | `string` | 날짜별 감정 이모지 |
| `memo_${userId}_${dateStr}` | `string` | 날짜별 하루 메모 |
| `photo_${userId}_${dateStr}` | `string` | 날짜별 사진 (base64 JPEG) |
| `running_${userId}_${dateStr}` | `{ dist, hours, mins, memo }` | 날짜별 러닝 기록 |
| `health_${userId}_${dateStr}` | `{ inbody, bloodSugar }` | 날짜별 건강 측정값 |
| `reset_v4_${userId}` | `'1'` | 마이그레이션 완료 플래그 |

---

## 배포 정보

| 항목 | 값 |
|------|-----|
| 저장소 | https://github.com/queennie72/todo |
| GitHub Pages URL | https://queennie72.github.io/todo/ |
| 로컬 개발 서버 | http://localhost:5173 |
| 로컬 데이터 서버 | http://localhost:3001 |
| 모바일 접속 | http://172.30.1.69:3001/todo/ |
| 배포 방법 | GitHub Actions (push → 자동 빌드·배포) |
| push 스크립트 | `node git-push.cjs <GH_TOKEN>` |

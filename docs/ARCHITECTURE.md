# Todo App — Architecture

**버전**: 2.0  
**작성일**: 2026-05-23

---

## 1. 개요

프론트엔드 단독 SPA(Single Page Application). 서버 없이 브라우저의 localStorage만으로 인증과 모든 데이터를 관리한다. Vite로 번들링하여 정적 파일로 배포 가능하다.

---

## 2. 기술 스택

| 역할 | 기술 | 버전 |
|------|------|------|
| UI 프레임워크 | React | 18.3 |
| 번들러 | Vite | 5.4 |
| React 플러그인 | @vitejs/plugin-react | 4.3 |
| 스타일 | CSS (Flexbox + Grid + CSS Variables) | — |
| 저장소 | Browser localStorage | — |
| 이미지 압축 | Canvas API (브라우저 내장) | — |
| 런타임 | 브라우저 (빌드 결과물은 순수 정적 파일) | — |

---

## 3. 디렉토리 구조

```
C:\claude\
├── docs/
│   ├── PRD.md              제품 요구사항
│   ├── ARCHITECTURE.md     이 문서
│   ├── API.md              훅·컴포넌트·스키마 레퍼런스
│   ├── TESTCASES.md        테스트 케이스
│   └── DIARY_PRD.md        감정일기 앱 PRD (별도 프로젝트)
├── src/
│   ├── main.jsx            React 루트 마운트
│   ├── App.jsx             라우팅 진입점 + useTodos/useLocalStorage/유틸
│   ├── App.css             전역 스타일
│   ├── hooks/
│   │   ├── useAuth.js      인증 상태 훅
│   │   └── useHabits.js    루틴 상태 훅 + 유틸 함수
│   ├── pages/
│   │   └── AuthPage.jsx    로그인/회원가입 화면
│   └── components/
│       ├── AddForm.jsx     할일 입력 폼
│       ├── Calendar.jsx    월간 달력 그리드
│       ├── HabitItem.jsx   단일 루틴 항목 (일반/compact 모드)
│       ├── MonthlyReview.jsx  5섹션 월간 히트맵 리뷰
│       ├── TodoItem.jsx    개별 할일 항목 (인라인 편집)
│       └── TodoList.jsx    할일 목록 렌더링
├── index.html
├── vite.config.js
└── package.json
```

---

## 4. 컴포넌트 트리

```
App                              ← 인증 + 뷰 상태 분기
├── AuthPage                     ← 비로그인 상태
│   └── (form)                   로그인 / 회원가입 폼
├── CalendarView                 ← 로그인 후 기본 화면
│   └── Calendar                 월간 달력 그리드
│       └── (cell)[]             날짜 셀 (루틴 바 + 할일 뱃지)
├── MonthlyReview                ← "한달 리뷰" 진입 시
│   └── (review-card)[] × 5     카테고리별 미니 달력 히트맵
└── TodoApp                      ← 날짜 선택 후 상세 화면
    ├── (header)                 날짜 타이틀 + 뒤로가기 + 로그아웃
    ├── section.section-mytodo   내 할일 (상단 강조)
    │   ├── ProgressBar
    │   ├── AddForm
    │   └── TodoList
    │       └── TodoItem[]
    ├── section (루틴)           오늘의 루틴
    │   ├── ProgressBar
    │   └── (habit-sec-group)[] × 5  카테고리별 2열 그리드
    │       └── HabitItem[]
    ├── section (감정)           오늘의 감정 이모지 피커
    ├── section (메모)           하루 메모 textarea
    └── section (사진)           오늘의 사진 업로드/미리보기
```

---

## 5. 상태 관리

별도 전역 상태 라이브러리 없이 React 훅만 사용한다.

### 5.1 `useAuth` — `src/hooks/useAuth.js`

| 항목 | 내용 |
|------|------|
| 위치 | `App` 컴포넌트에서 호출 |
| 상태 | `user: { id, email } \| null` |
| 초기화 | 마운트 시 `localStorage.auth_session` 읽어 세션 복원 |
| 노출 API | `login(email, password)`, `register(email, password)`, `logout()` |

### 5.2 `useTodos` — `src/App.jsx` 내부 함수

| 항목 | 내용 |
|------|------|
| 위치 | `TodoApp` 컴포넌트에서 호출 |
| 상태 | `todos: Array<{ id, text, done }>` |
| 스토리지 키 | `todos_${userId}_${dateStr}` |
| 초기값 | 빈 배열 (기본 항목 없음) |
| 노출 API | `addTodo`, `deleteTodo`, `toggleTodo`, `updateTodo`, `clearDone` |

### 5.3 `useHabits` — `src/hooks/useHabits.js`

| 항목 | 내용 |
|------|------|
| 위치 | `TodoApp` 컴포넌트에서 호출 |
| 상태 | `states: boolean[10]` (루틴별 완료 여부) |
| 스토리지 키 | `habits_${userId}_${dateStr}` |
| 노출 API | `habits: [{id, text, done}]`, `toggleHabit(id)` |
| 유틸 (훅 외) | `getHabitStats(userId, dateStr)` — 달력용 순수 함수 |

**`DAILY_HABITS` 배열 (index 순):**

| index | 이름 | 카테고리 |
|-------|------|----------|
| 0 | 인바디 측정 | 건강측정 |
| 1 | 공복혈당 측정 | 건강측정 |
| 2 | 단백질 95g 섭취 | 식단 |
| 3 | 애플워치 움직이기 링 완성 | 생활습관 |
| 4 | 하루 물 2L 마시기 | 식단 |
| 5 | 영양제 챙겨 먹기 | 식단 |
| 6 | 오늘 하루 리뷰하기 | 하루정리 |
| 7 | F45출석 | 운동 |
| 8 | RUN | 운동 |
| 9 | 그외운동 | 운동 |

### 5.4 `useLocalStorage` — `src/App.jsx` 내부 함수

범용 localStorage 동기화 훅. 감정·메모·사진에 사용.

```js
const [value, setValue] = useLocalStorage(key, defaultValue)
```

- 마운트 시 `key`로 값 읽기
- `key` 변경 시(날짜 이동) 자동 재로드
- 값 변경 시 자동 저장

### 5.5 `clearLegacyData` — `src/hooks/useHabits.js`

| 항목 | 내용 |
|------|------|
| 호출 위치 | `App` 컴포넌트, `user?.id` 변경 시 `useEffect` |
| 동작 | `todos_*`, `habits_*` 키 전체 삭제 (1회) |
| 플래그 | `reset_v4_${userId}` 설정 후 재실행 방지 |
| 목적 | 루틴 항목 수·구조 변경 시 구버전 데이터 초기화 |

---

## 6. 뷰 분기 로직

```
App 렌더링
  │
  ├─ user === null ──────────────▶ AuthPage
  │
  └─ user 있음
       │
       ├─ view === 'review' ──────▶ MonthlyReview
       │
       └─ view === 'calendar'
              │
              ├─ selectedDate === null ─▶ CalendarView (기본)
              │
              └─ selectedDate 있음 ────▶ TodoApp (날짜 상세)
```

**상태 전환:**

| 액션 | 변화 |
|------|------|
| 달력 날짜 클릭 | `selectedDate` 설정 |
| 뒤로가기(‹) | `selectedDate = null` |
| 한달 리뷰 버튼 | `view = 'review'` |
| 리뷰 뒤로가기 | `view = 'calendar'` |
| 로그아웃 | `user = null`, 상태 초기화 |

---

## 7. 데이터 흐름

```
사용자 액션
    │
    ▼
컴포넌트 이벤트 핸들러
    │
    ▼
훅 함수 호출
    │
    ├─▶ React 상태 업데이트 → 리렌더링
    │
    └─▶ localStorage 자동 저장 (useEffect)
```

달력 통계 조회 (Calendar, MonthlyReview):
```
컴포넌트 렌더링
    │
    └─▶ getHabitStats(userId, dateStr) ──▶ localStorage 직접 읽기
        getUserTodoStats(userId, dateStr)    (훅 없이 순수 함수)
```

---

## 8. localStorage 키 전체 목록

| 키 패턴 | 타입 | 설명 |
|---------|------|------|
| `auth_users` | `Record<email, StoredUser>` | 전체 유저 목록 |
| `auth_session` | `{ id, email }` | 현재 로그인 세션 |
| `todos_${userId}_${dateStr}` | `Todo[]` | 날짜별 내 할일 |
| `habits_${userId}_${dateStr}` | `boolean[10]` | 날짜별 루틴 완료 상태 |
| `emoji_${userId}_${dateStr}` | `string` | 날짜별 감정 이모지 |
| `memo_${userId}_${dateStr}` | `string` | 날짜별 하루 메모 |
| `photo_${userId}_${dateStr}` | `string` | 날짜별 사진 (base64 JPEG) |
| `reset_v4_${userId}` | `'1'` | 마이그레이션 완료 플래그 |

---

## 9. 인증 흐름

```
앱 로드
  │
  ├─ auth_session 있음 ──▶ CalendarView 표시 + clearLegacyData 실행
  │
  └─ auth_session 없음 ──▶ AuthPage 표시
         │
         ├─ 로그인 성공 ──▶ auth_session 저장 ──▶ CalendarView
         ├─ 로그인 실패 ──▶ 오류 메시지 표시
         └─ 회원가입 성공 ──▶ auth_users + auth_session 저장 ──▶ CalendarView
```

---

## 10. 이미지 압축 로직

`src/App.jsx` 내 `compressImage(file)` 함수:

```
파일 선택
  │
  ▼
FileReader.readAsDataURL → base64
  │
  ▼
Image 객체 로드
  │
  ▼
가로·세로 중 긴 쪽이 900px 초과 시 비율 유지하며 축소
  │
  ▼
Canvas에 drawImage
  │
  ▼
canvas.toDataURL('image/jpeg', 0.72) → 압축된 base64
  │
  ▼
localStorage 저장
```

---

## 11. 빌드 & 배포

### 로컬 개발
```bash
npm run dev      # http://localhost:5173 (HMR 활성)
```

### 프로덕션 빌드
```bash
npm run build    # dist/ 생성
npm run preview  # 빌드 결과 로컬 미리보기
```

### GitHub 배포
GitHub Contents API를 통해 파일별 PUT 요청으로 동기화.  
저장소: `https://github.com/queennie72/todo`

### 배포 옵션 (정적 호스팅)

| 플랫폼 | 방법 |
|--------|------|
| Vercel | 저장소 연결, 빌드 커맨드: `npm run build`, 출력: `dist` |
| Netlify | 동일 설정 |
| GitHub Pages | `gh-pages` 패키지로 `dist/` 브랜치 배포 |

---

## 12. 향후 마이그레이션 고려사항

| 현재 | 교체 대상 |
|------|-----------|
| `useAuth.js` localStorage 인증 | REST API / Firebase Auth / Supabase Auth |
| `useTodos` localStorage 저장 | API 호출 (fetch / React Query) |
| `useHabits` localStorage 저장 | API 호출 |
| `useLocalStorage` 감정/메모 저장 | API 호출 |
| base64 사진 localStorage 저장 | S3 / Cloudflare R2 / Firebase Storage |
| `btoa()` 비밀번호 인코딩 | 서버사이드 bcrypt 해싱 |
| `crypto.randomUUID()` 클라이언트 ID | DB 자동 생성 PK |
| 루틴 고정 배열 | 사용자 커스터마이징 API |

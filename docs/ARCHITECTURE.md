# Todo App — Architecture

**버전**: 1.0  
**작성일**: 2026-05-23

---

## 1. 개요

프론트엔드 단독 SPA(Single Page Application). 서버 없이 브라우저의 localStorage만으로 인증과 데이터를 관리한다. Vite로 번들링하여 정적 파일로 배포 가능하다.

---

## 2. 기술 스택

| 역할 | 기술 | 버전 |
|------|------|------|
| UI 프레임워크 | React | 18.3 |
| 번들러 | Vite | 5.4 |
| React 플러그인 | @vitejs/plugin-react | 4.3 |
| 스타일 | CSS (Flexbox + CSS Variables) | — |
| 저장소 | Browser localStorage | — |
| 런타임 | 브라우저 (빌드 결과물은 순수 정적 파일) | — |

---

## 3. 디렉토리 구조

```
C:\claude\
├── docs/
│   ├── PRD.md              제품 요구사항
│   └── ARCHITECTURE.md     이 문서
├── src/
│   ├── main.jsx            React 루트 마운트
│   ├── App.jsx             라우팅 진입점 + useTodos 훅
│   ├── App.css             전역 스타일
│   ├── hooks/
│   │   └── useAuth.js      인증 상태 훅
│   ├── pages/
│   │   └── AuthPage.jsx    로그인/회원가입 화면
│   └── components/
│       ├── AddForm.jsx     Todo 입력 폼
│       ├── TodoList.jsx    Todo 목록 렌더링
│       └── TodoItem.jsx    개별 Todo 항목 (인라인 편집)
├── index.html              Vite 진입 HTML
├── vite.config.js
└── package.json
```

---

## 4. 컴포넌트 트리

```
App                         ← 인증 상태에 따라 분기
├── AuthPage                ← 비로그인 상태
│   └── (form)             로그인 / 회원가입 폼
└── TodoApp                 ← 로그인 상태
    ├── (header)            유저 이메일 + 로그아웃
    ├── AddForm             Todo 추가 입력
    ├── TodoList            목록 컨테이너
    │   └── TodoItem[]      개별 항목 (완료·수정·삭제)
    └── (footer)            완료 항목 일괄 삭제
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

**localStorage 키**

| 키 | 형식 | 설명 |
|----|------|------|
| `auth_users` | `{ [email]: { id, password } }` | 전체 유저 목록 |
| `auth_session` | `{ id, email }` | 현재 로그인 세션 |

> 비밀번호는 `btoa()`로 인코딩 저장. MVP 전용이며 실 서비스 시 서버사이드 해싱 필요.

### 5.2 `useTodos` — `src/App.jsx` 내부

| 항목 | 내용 |
|------|------|
| 위치 | `TodoApp` 컴포넌트에서 호출 |
| 상태 | `todos: Array<{ id, text, done }>` |
| 스토리지 키 | `todos_{userId}` (사용자별 격리) |
| 동기화 | `useEffect`로 todos 변경 시 localStorage 자동 저장 |
| 노출 API | `addTodo`, `deleteTodo`, `toggleTodo`, `updateTodo`, `clearDone` |

---

## 6. 데이터 흐름

```
사용자 액션
    │
    ▼
컴포넌트 이벤트 핸들러
    │
    ▼
훅 함수 호출 (useAuth / useTodos)
    │
    ├─▶ React 상태 업데이트 (setUser / setTodos)
    │       │
    │       └─▶ 리렌더링
    │
    └─▶ localStorage 동기 저장
```

---

## 7. 인증 흐름

```
앱 로드
  │
  ├─ auth_session 있음 ──▶ TodoApp 표시
  │
  └─ auth_session 없음 ──▶ AuthPage 표시
         │
         ├─ 로그인 성공 ──▶ auth_session 저장 ──▶ TodoApp 표시
         ├─ 로그인 실패 ──▶ 오류 메시지 표시
         └─ 회원가입 성공 ──▶ auth_users 저장 + auth_session 저장 ──▶ TodoApp 표시
```

---

## 8. 빌드 & 배포

### 로컬 개발
```bash
npm run dev      # http://localhost:5173 (HMR 활성)
```

### 프로덕션 빌드
```bash
npm run build    # dist/ 생성
npm run preview  # 빌드 결과 로컬 미리보기
```

### 배포 옵션 (정적 호스팅)

| 플랫폼 | 방법 |
|--------|------|
| Vercel | 저장소 연결 후 자동 배포 (빌드 커맨드: `npm run build`, 출력: `dist`) |
| Netlify | 동일 설정으로 드래그앤드롭 또는 Git 연동 |
| GitHub Pages | `gh-pages` 패키지로 `dist/` 브랜치 배포 |

---

## 9. 향후 마이그레이션 고려사항

현재 구조에서 백엔드를 붙일 경우 교체 지점:

| 현재 | 교체 대상 |
|------|-----------|
| `useAuth.js` localStorage 인증 | REST API / Firebase Auth / Supabase Auth |
| `useTodos` localStorage 저장 | API 호출 (fetch / React Query) |
| `btoa()` 비밀번호 인코딩 | 서버사이드 bcrypt 해싱 |
| `crypto.randomUUID()` 클라이언트 ID 생성 | DB 자동 생성 PK |

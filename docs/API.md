# Todo App — API Reference

**버전**: 2.0  
**작성일**: 2026-05-23

> 현재 앱은 프론트엔드 단독 구조로 외부 REST API가 없습니다.  
> 이 문서는 **훅(Hook) API**, **컴포넌트 Props API**, **localStorage 스키마**, **타입 정의**를 정의합니다.

---

## 목차

1. [Hooks](#1-hooks)
   - [useAuth](#11-useauth)
   - [useTodos](#12-usetodos)
   - [useHabits](#13-usehabits)
   - [useLocalStorage](#14-uselocalstorage)
2. [유틸 함수](#2-유틸-함수)
   - [getHabitStats](#21-gethabitstats)
   - [clearLegacyData](#22-clearlegacydata)
   - [compressImage](#23-compressimage)
3. [Components](#3-components)
   - [AuthPage](#31-authpage)
   - [Calendar](#32-calendar)
   - [MonthlyReview](#33-monthlyreview)
   - [HabitItem](#34-habititem)
   - [AddForm](#35-addform)
   - [TodoList](#36-todolist)
   - [TodoItem](#37-todoitem)
4. [상수](#4-상수)
5. [localStorage 스키마](#5-localstorage-스키마)
6. [타입 정의](#6-타입-정의)
7. [에러 레퍼런스](#7-에러-레퍼런스)

---

## 1. Hooks

### 1.1 `useAuth`

**위치**: `src/hooks/useAuth.js`  
**사용처**: `src/App.jsx`

인증 상태와 로그인·회원가입·로그아웃을 관리한다.

```js
const { user, login, register, logout } = useAuth()
```

#### 반환값

| 이름 | 타입 | 설명 |
|------|------|------|
| `user` | `User \| null` | 현재 로그인 유저. 비로그인 시 `null` |
| `login` | `Function` | 이메일/비밀번호로 로그인 |
| `register` | `Function` | 회원가입 후 즉시 로그인 |
| `logout` | `Function` | 세션 삭제 후 로그아웃 |

#### `login(email, password)`

```js
login(email: string, password: string): void
```

- 성공: `auth_session` 저장, `user` 상태 업데이트
- 실패: `Error` throw → `"이메일 또는 비밀번호가 올바르지 않습니다."`

#### `register(email, password)`

```js
register(email: string, password: string): void
```

| 파라미터 | 제약 |
|----------|------|
| `email` | 유효한 이메일 형식 |
| `password` | 최소 6자 |

- 성공: `auth_users` 추가, `auth_session` 저장, `user` 상태 업데이트
- 실패: `Error` throw → `"이미 사용 중인 이메일입니다."`

#### `logout()`

`auth_session` 제거, `user = null`

---

### 1.2 `useTodos`

**위치**: `src/App.jsx` 내부 함수  
**사용처**: `TodoApp` 컴포넌트

날짜별 내 할일 목록을 관리한다. 기본값은 빈 배열.

```js
const { todos, addTodo, deleteTodo, toggleTodo, updateTodo, clearDone } =
  useTodos(userId, dateStr)
```

#### 파라미터

| 이름 | 타입 | 설명 |
|------|------|------|
| `userId` | `string` | 현재 유저 UUID |
| `dateStr` | `string` | `"YYYY-MM-DD"` 형식 날짜 |

#### 반환값

| 이름 | 타입 | 설명 |
|------|------|------|
| `todos` | `Todo[]` | 현재 할일 배열 |
| `addTodo(text)` | `Function` | 최신순으로 추가 |
| `deleteTodo(id)` | `Function` | ID로 삭제 |
| `toggleTodo(id)` | `Function` | `done` 반전 |
| `updateTodo(id, text)` | `Function` | 텍스트 수정 |
| `clearDone()` | `Function` | 완료 항목 전체 삭제 |

**스토리지 키**: `todos_${userId}_${dateStr}`

---

### 1.3 `useHabits`

**위치**: `src/hooks/useHabits.js`  
**사용처**: `TodoApp` 컴포넌트

날짜별 10개 고정 루틴의 완료 상태를 관리한다.

```js
const { habits, toggleHabit } = useHabits(userId, dateStr)
```

#### 파라미터

| 이름 | 타입 | 설명 |
|------|------|------|
| `userId` | `string` | 현재 유저 UUID |
| `dateStr` | `string` | `"YYYY-MM-DD"` 형식 날짜 |

#### 반환값

| 이름 | 타입 | 설명 |
|------|------|------|
| `habits` | `Habit[]` | 10개 루틴 객체 배열 |
| `toggleHabit(id)` | `Function` | 루틴 완료 상태 반전 |

`Habit` 객체:
```js
{ id: number, text: string, done: boolean }
```

**스토리지 키**: `habits_${userId}_${dateStr}`  
**저장 형식**: `boolean[10]` — `DAILY_HABITS` 배열과 index 대응

---

### 1.4 `useLocalStorage`

**위치**: `src/App.jsx` 내부 함수  
**사용처**: `TodoApp` (감정·메모·사진)

범용 localStorage 동기화 훅.

```js
const [value, setValue] = useLocalStorage(key, defaultValue)
```

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `key` | `string` | localStorage 키 |
| `defaultValue` | `any` | 저장값 없을 때 기본값 |

- `key` 변경 시 자동으로 새 키의 값을 로드 (날짜 이동 대응)
- 값 변경 시 자동 저장. `try/catch`로 용량 초과 무시

---

## 2. 유틸 함수

### 2.1 `getHabitStats`

**위치**: `src/hooks/useHabits.js`  
**사용처**: `Calendar.jsx`, `MonthlyReview.jsx`

훅 없이 localStorage를 직접 읽어 루틴 통계를 반환한다. (달력 셀 렌더링용)

```js
getHabitStats(userId: string, dateStr: string): { done: number, total: number }
```

- 저장값 없으면 `{ done: 0, total: 10 }` 반환

---

### 2.2 `clearLegacyData`

**위치**: `src/hooks/useHabits.js`  
**사용처**: `App` 컴포넌트 (user 변경 useEffect)

1회성 데이터 마이그레이션. 루틴 구조 변경 시 구버전 데이터를 초기화한다.

```js
clearLegacyData(userId: string): void
```

- `reset_v4_${userId}` 플래그가 없을 때만 실행
- 실행 시: `todos_${userId}_*`, `habits_${userId}_*` 키 전체 삭제
- 실행 후: `reset_v4_${userId} = '1'` 저장

---

### 2.3 `compressImage`

**위치**: `src/App.jsx` 내부 함수

업로드된 이미지를 Canvas API로 리사이즈·압축 후 base64 반환.

```js
compressImage(file: File): Promise<string>
```

- 최대 900px (가로·세로 중 긴 쪽 기준), 비율 유지
- 포맷: `image/jpeg`, 품질: `0.72`
- 결과: `data:image/jpeg;base64,...` 형식 문자열

---

## 3. Components

### 3.1 `AuthPage`

**위치**: `src/pages/AuthPage.jsx`  
**렌더 조건**: `user === null`

#### Props

| 이름 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `onLogin` | `(email, password) => void` | ✓ | 로그인 실행 |
| `onRegister` | `(email, password) => void` | ✓ | 회원가입 실행 |

#### 내부 상태

| 상태 | 타입 | 초기값 |
|------|------|--------|
| `mode` | `'login' \| 'register'` | `'login'` |
| `email` | `string` | `''` |
| `password` | `string` | `''` |
| `error` | `string` | `''` |

---

### 3.2 `Calendar`

**위치**: `src/components/Calendar.jsx`  
**사용처**: `CalendarView`

월간 달력 그리드. 날짜 셀에 루틴 진행 바와 내 할일 수를 표시한다.

#### Props

| 이름 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `userId` | `string` | ✓ | localStorage 조회용 유저 ID |
| `onSelectDate` | `(dateStr: string) => void` | ✓ | 날짜 클릭 콜백 |

#### 날짜 셀 표시

- **루틴 진행 바**: `getHabitStats()` 기반 (항상 표시)
- **N/10 또는 ✓**: 루틴 달성 수 / 전체
- **+완료/전체 뱃지**: `todos_${userId}_${dateStr}` 직접 읽어 내 할일 있을 때만 표시
- **전체 완료 강조**: 루틴 + 할일 모두 완료 시 셀 배경 초록

---

### 3.3 `MonthlyReview`

**위치**: `src/components/MonthlyReview.jsx`  
**사용처**: `App` (view === 'review')

5개 카테고리별 월간 루틴 달성 히트맵.

#### Props

| 이름 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `userId` | `string` | ✓ | localStorage 조회용 유저 ID |
| `onBack` | `() => void` | ✓ | 뒤로가기 콜백 |

#### 카테고리 정의

| 이름 | 색상 | 루틴 index |
|------|------|-----------|
| 건강측정 | `#3b82f6` | [0, 1] |
| 식단 | `#22c55e` | [2, 4, 5] |
| 생활습관 | `#a855f7` | [3] |
| 운동 | `#f97316` | [7, 8, 9] |
| 하루정리 | `#14b8a6` | [6] |

#### 셀 색상 규칙

| 상태 | 색상 |
|------|------|
| 미래 날짜 | 점선 테두리, 투명 (opacity 0.35) |
| 완료율 0%, 과거 | 투명 (테두리만) |
| 완료율 1~99% | 연한 카테고리 색 |
| 완료율 100% | 진한 카테고리 색, 날짜 숫자 흰색 |
| 오늘 | 카테고리 색 2px 테두리 강조 |

---

### 3.4 `HabitItem`

**위치**: `src/components/HabitItem.jsx`  
**사용처**: `TodoApp` 내 루틴 섹션

#### Props

| 이름 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `habit` | `Habit` | ✓ | `{ id, text, done }` |
| `onToggle` | `(id: number) => void` | ✓ | 완료 토글 |
| `compact` | `boolean` | — | true 시 "완료" 뱃지 숨김 (2열 그리드용) |

- `habit`이 `undefined`이면 `null` 렌더링 (안전 처리)
- 완료 시: 초록 체크 버튼, 취소선, 초록 배경

---

### 3.5 `AddForm`

**위치**: `src/components/AddForm.jsx`

#### Props

| 이름 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `onAdd` | `(text: string) => void` | ✓ | 유효 텍스트 입력 시 호출 |

- Enter 또는 추가 버튼 → `onAdd(text.trim())` 후 필드 초기화
- 공백만 입력 시 무시

---

### 3.6 `TodoList`

**위치**: `src/components/TodoList.jsx`

#### Props

| 이름 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `todos` | `Todo[]` | ✓ | 렌더링할 할일 배열 |
| `onToggle` | `(id: number) => void` | ✓ | 완료 토글 콜백 |
| `onDelete` | `(id: number) => void` | ✓ | 삭제 콜백 |
| `onUpdate` | `(id: number, text: string) => void` | ✓ | 수정 콜백 |

---

### 3.7 `TodoItem`

**위치**: `src/components/TodoItem.jsx`

#### Props

| 이름 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `todo` | `Todo` | ✓ | 렌더링할 할일 객체 |
| `onToggle` | `(id) => void` | ✓ | 체크박스 변경 시 |
| `onDelete` | `(id) => void` | ✓ | 삭제 버튼 클릭 시 |
| `onUpdate` | `(id, text) => void` | ✓ | 편집 확정 시 |

#### 편집 UX

| 동작 | 결과 |
|------|------|
| ✎ 버튼 클릭 | 편집 모드, 자동 포커스 |
| Enter | 저장 (`onUpdate`), 편집 종료 |
| Escape | 취소, 원본 복원 |
| blur | Enter와 동일하게 저장 |
| 빈 문자열 | 저장 무시, 편집 종료 |

---

## 4. 상수

### `DAILY_HABITS` — `src/hooks/useHabits.js`

```js
export const DAILY_HABITS = [
  '인바디 측정',           // index 0
  '공복혈당 측정',          // index 1
  '단백질 95g 섭취',        // index 2
  '애플워치 움직이기 링 완성', // index 3
  '하루 물 2L 마시기',      // index 4
  '영양제 챙겨 먹기',        // index 5
  '오늘 하루 리뷰하기',      // index 6
  'F45출석',               // index 7
  'RUN',                   // index 8
  '그외운동',               // index 9
]
```

### `HABIT_SECTIONS` — `src/App.jsx`

```js
const HABIT_SECTIONS = [
  { name: '건강측정', color: '#3b82f6', indices: [0, 1] },
  { name: '식단',    color: '#22c55e', indices: [2, 4, 5] },
  { name: '생활습관', color: '#a855f7', indices: [3] },
  { name: '운동',    color: '#f97316', indices: [7, 8, 9] },
  { name: '하루정리', color: '#14b8a6', indices: [6] },
]
```

### `EMOJIS` — `src/App.jsx`

```js
const EMOJIS = [
  { emoji: '😊', label: '행복' },  { emoji: '🥰', label: '사랑' },  { emoji: '🤩', label: '신남' },
  { emoji: '😎', label: '멋짐' },  { emoji: '🥳', label: '파티' },  { emoji: '😄', label: '기쁨' },
  { emoji: '🤗', label: '따뜻함' }, { emoji: '😌', label: '평온' },  { emoji: '🙂', label: '만족' },
  { emoji: '😴', label: '졸림' },  { emoji: '😪', label: '피곤' },  { emoji: '🥺', label: '슬픔' },
  { emoji: '😢', label: '눈물' },  { emoji: '😭', label: '통곡' },  { emoji: '😅', label: '당황' },
  { emoji: '😤', label: '답답' },  { emoji: '😡', label: '화남' },  { emoji: '🤔', label: '고민' },
]
```

---

## 5. localStorage 스키마

| 키 | 타입 | 설명 |
|----|------|------|
| `auth_users` | `Record<string, StoredUser>` | 전체 유저 목록 |
| `auth_session` | `Session` | 현재 로그인 세션 |
| `todos_${userId}_${dateStr}` | `Todo[]` | 날짜별 내 할일 |
| `habits_${userId}_${dateStr}` | `boolean[10]` | 날짜별 루틴 완료 상태 |
| `emoji_${userId}_${dateStr}` | `string` | 날짜별 감정 이모지 (1개 문자) |
| `memo_${userId}_${dateStr}` | `string` | 날짜별 하루 메모 |
| `photo_${userId}_${dateStr}` | `string` | 날짜별 사진 base64 |
| `reset_v4_${userId}` | `'1'` | 마이그레이션 완료 플래그 |

### `auth_users`
```json
{
  "user@example.com": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "password": "cGFzc3dvcmQ="
  }
}
```

### `habits_${userId}_${dateStr}`
```json
[false, true, true, false, true, true, false, false, false, false]
```
index 순서는 `DAILY_HABITS` 배열과 동일.

### `todos_${userId}_${dateStr}`
```json
[
  { "id": 1716451200000, "text": "병원 예약", "done": false },
  { "id": 1716451100000, "text": "메일 답장", "done": true }
]
```

---

## 6. 타입 정의

```ts
type User = {
  id: string       // crypto.randomUUID()
  email: string    // 소문자 정규화
}

type Todo = {
  id: number       // Date.now()
  text: string
  done: boolean
}

type Habit = {
  id: number       // DAILY_HABITS index (0~9)
  text: string
  done: boolean
}

type StoredUser = {
  id: string
  password: string // btoa(plaintext)
}

type Session = {
  id: string
  email: string
}

type HabitStats = {
  done: number     // 완료된 루틴 수
  total: number    // 전체 루틴 수 (항상 10)
}
```

---

## 7. 에러 레퍼런스

| 발생 위치 | 조건 | 메시지 |
|-----------|------|--------|
| `useAuth.login` | 이메일 미존재 또는 비밀번호 불일치 | `"이메일 또는 비밀번호가 올바르지 않습니다."` |
| `useAuth.register` | 이미 등록된 이메일 | `"이미 사용 중인 이메일입니다."` |
| `useLocalStorage` save | localStorage 용량 초과 | 무시 (try/catch, 사진 저장 실패 가능) |

에러는 `AuthPage`의 `handleSubmit`에서 catch하여 UI에 표시된다.

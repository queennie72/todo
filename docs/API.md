# Todo App — API Reference

**버전**: 1.0  
**작성일**: 2026-05-23

> 현재 앱은 프론트엔드 단독 구조로 외부 REST API가 없습니다.  
> 이 문서는 **훅(Hook) API**, **컴포넌트 Props API**, **localStorage 스키마**를 정의합니다.

---

## 목차

1. [Hooks](#1-hooks)
   - [useAuth](#11-useauth)
   - [useTodos](#12-usetodos)
2. [Components](#2-components)
   - [AuthPage](#21-authpage)
   - [AddForm](#22-addform)
   - [TodoList](#23-todolist)
   - [TodoItem](#24-todoitem)
3. [localStorage 스키마](#3-localstorage-스키마)
4. [타입 정의](#4-타입-정의)
5. [에러 레퍼런스](#5-에러-레퍼런스)

---

## 1. Hooks

### 1.1 `useAuth`

**위치**: `src/hooks/useAuth.js`  
**사용처**: `src/App.jsx`

인증 상태와 로그인·회원가입·로그아웃 동작을 관리한다. 마운트 시 `localStorage`에서 세션을 복원한다.

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

---

#### `login(email, password)`

```js
login(email: string, password: string): void
```

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `email` | `string` | 사용자 이메일 (대소문자 무시) |
| `password` | `string` | 사용자 비밀번호 |

- 성공 시 `auth_session`을 localStorage에 저장하고 `user` 상태 업데이트
- 실패 시 `Error` throw

**에러**

| 조건 | 메시지 |
|------|--------|
| 이메일 미존재 또는 비밀번호 불일치 | `"이메일 또는 비밀번호가 올바르지 않습니다."` |

---

#### `register(email, password)`

```js
register(email: string, password: string): void
```

| 파라미터 | 타입 | 제약 | 설명 |
|----------|------|------|------|
| `email` | `string` | 유효한 이메일 형식 | 사용자 이메일 |
| `password` | `string` | 최소 6자 | 사용자 비밀번호 |

- 성공 시 `auth_users`에 유저 추가, `auth_session` 저장, `user` 상태 업데이트
- 실패 시 `Error` throw

**에러**

| 조건 | 메시지 |
|------|--------|
| 이미 등록된 이메일 | `"이미 사용 중인 이메일입니다."` |

---

#### `logout()`

```js
logout(): void
```

`auth_session`을 localStorage에서 제거하고 `user`를 `null`로 초기화한다.

---

### 1.2 `useTodos`

**위치**: `src/App.jsx` (내부 함수)  
**사용처**: `TodoApp` 컴포넌트

로그인한 사용자의 Todo 목록을 관리한다. 상태 변경 시 자동으로 localStorage에 동기화된다.

```js
const { todos, addTodo, deleteTodo, toggleTodo, updateTodo, clearDone } = useTodos(userId)
```

#### 파라미터

| 이름 | 타입 | 설명 |
|------|------|------|
| `userId` | `string` | 현재 로그인 유저의 UUID. 스토리지 키 격리에 사용 |

#### 반환값

| 이름 | 타입 | 설명 |
|------|------|------|
| `todos` | `Todo[]` | 현재 Todo 배열 (최신순) |
| `addTodo` | `Function` | Todo 추가 |
| `deleteTodo` | `Function` | Todo 삭제 |
| `toggleTodo` | `Function` | 완료 상태 토글 |
| `updateTodo` | `Function` | Todo 텍스트 수정 |
| `clearDone` | `Function` | 완료된 항목 일괄 삭제 |

---

#### `addTodo(text)`

```js
addTodo(text: string): void
```

새 Todo를 목록 맨 앞에 추가한다.

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `text` | `string` | Todo 내용. 빈 문자열은 `AddForm`에서 사전 차단 |

생성되는 Todo 객체:

```js
{ id: Date.now(), text, done: false }
```

---

#### `deleteTodo(id)`

```js
deleteTodo(id: number): void
```

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `id` | `number` | 삭제할 Todo의 ID |

---

#### `toggleTodo(id)`

```js
toggleTodo(id: number): void
```

`done` 값을 반전시킨다.

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `id` | `number` | 토글할 Todo의 ID |

---

#### `updateTodo(id, text)`

```js
updateTodo(id: number, text: string): void
```

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `id` | `number` | 수정할 Todo의 ID |
| `text` | `string` | 변경할 내용. 빈 문자열은 `TodoItem`에서 사전 차단 |

---

#### `clearDone()`

```js
clearDone(): void
```

`done: true`인 항목을 모두 삭제한다.

---

## 2. Components

### 2.1 `AuthPage`

**위치**: `src/pages/AuthPage.jsx`  
**렌더 조건**: `user === null`일 때 `App`에서 렌더링

로그인/회원가입 화면. 내부 `mode` 상태로 두 폼을 전환한다.

#### Props

| 이름 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `onLogin` | `(email: string, password: string) => void` | ✓ | 로그인 실행 함수 |
| `onRegister` | `(email: string, password: string) => void` | ✓ | 회원가입 실행 함수 |

#### 내부 상태

| 상태 | 타입 | 초기값 | 설명 |
|------|------|--------|------|
| `mode` | `'login' \| 'register'` | `'login'` | 현재 폼 모드 |
| `email` | `string` | `''` | 이메일 입력값 |
| `password` | `string` | `''` | 비밀번호 입력값 |
| `remember` | `boolean` | `false` | Remember me 체크 (UI 전용) |
| `error` | `string` | `''` | 오류 메시지 |

---

### 2.2 `AddForm`

**위치**: `src/components/AddForm.jsx`

Todo 텍스트를 입력받아 추가하는 폼 컴포넌트.

#### Props

| 이름 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `onAdd` | `(text: string) => void` | ✓ | 유효한 텍스트 입력 시 호출. 빈 문자열은 내부에서 차단하여 전달하지 않음 |

#### 동작

- Enter 또는 추가 버튼 → `onAdd(text.trim())` 호출 후 입력 필드 초기화
- 공백만 입력된 경우 제출 무시

---

### 2.3 `TodoList`

**위치**: `src/components/TodoList.jsx`

Todo 배열을 순회하여 `TodoItem`을 렌더링한다. 빈 배열이면 빈 상태 메시지를 표시한다.

#### Props

| 이름 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `todos` | `Todo[]` | ✓ | 렌더링할 Todo 배열 |
| `onToggle` | `(id: number) => void` | ✓ | 완료 토글 콜백 |
| `onDelete` | `(id: number) => void` | ✓ | 삭제 콜백 |
| `onUpdate` | `(id: number, text: string) => void` | ✓ | 수정 콜백 |

---

### 2.4 `TodoItem`

**위치**: `src/components/TodoItem.jsx`

단일 Todo 항목을 렌더링한다. 인라인 편집 모드를 내부 상태로 관리한다.

#### Props

| 이름 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `todo` | `Todo` | ✓ | 렌더링할 Todo 객체 |
| `onToggle` | `(id: number) => void` | ✓ | 체크박스 변경 시 호출 |
| `onDelete` | `(id: number) => void` | ✓ | 삭제 버튼 클릭 시 호출 |
| `onUpdate` | `(id: number, text: string) => void` | ✓ | 편집 확정 시 호출 |

#### 내부 상태

| 상태 | 타입 | 초기값 | 설명 |
|------|------|--------|------|
| `editing` | `boolean` | `false` | 편집 모드 여부 |
| `editValue` | `string` | `todo.text` | 편집 중인 텍스트 |

#### 편집 UX

| 동작 | 결과 |
|------|------|
| ✎ 버튼 클릭 | 편집 모드 진입, 입력 필드 자동 포커스 |
| `Enter` | 변경사항 저장 (`onUpdate` 호출), 편집 모드 종료 |
| `Escape` | 변경 취소, 원본 텍스트 복원, 편집 모드 종료 |
| 포커스 이탈 (`blur`) | `Enter`와 동일하게 저장 |
| 빈 문자열 저장 시도 | 저장 무시, 편집 모드만 종료 |

---

## 3. localStorage 스키마

| 키 | 타입 | 설명 |
|----|------|------|
| `auth_users` | `Record<string, StoredUser>` | 전체 유저 목록 |
| `auth_session` | `Session` | 현재 로그인 세션 |
| `todos_{userId}` | `Todo[]` | 유저별 Todo 목록 |

### `auth_users`

```json
{
  "user@example.com": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "password": "cGFzc3dvcmQ="
  }
}
```

- 키: 소문자 정규화된 이메일
- `password`: `btoa(plaintext)` 인코딩 값

### `auth_session`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com"
}
```

### `todos_{userId}`

```json
[
  {
    "id": 1716451200000,
    "text": "장보기",
    "done": false
  },
  {
    "id": 1716451100000,
    "text": "운동하기",
    "done": true
  }
]
```

---

## 4. 타입 정의

```ts
type User = {
  id: string       // crypto.randomUUID() 생성 UUID v4
  email: string    // 소문자 정규화된 이메일
}

type Todo = {
  id: number       // Date.now() 생성 타임스탬프
  text: string     // Todo 내용
  done: boolean    // 완료 여부
}

type StoredUser = {
  id: string       // UUID v4
  password: string // btoa(plaintext)
}

type Session = {
  id: string
  email: string
}
```

---

## 5. 에러 레퍼런스

| 발생 위치 | 조건 | 메시지 |
|-----------|------|--------|
| `useAuth.login` | 이메일 미존재 또는 비밀번호 불일치 | `"이메일 또는 비밀번호가 올바르지 않습니다."` |
| `useAuth.register` | 이미 등록된 이메일 | `"이미 사용 중인 이메일입니다."` |

에러는 `AuthPage`의 `handleSubmit`에서 catch하여 `error` 상태에 저장, UI에 표시된다.

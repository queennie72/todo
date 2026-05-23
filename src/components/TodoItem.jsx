import { useState } from 'react'

export default function TodoItem({ todo, onToggle, onDelete, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(todo.text)

  function commitEdit() {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== todo.text) onUpdate(todo.id, trimmed)
    setEditing(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') { e.preventDefault(); commitEdit() }
    if (e.key === 'Escape') { setEditValue(todo.text); setEditing(false) }
  }

  return (
    <li className={`todo-item${todo.done ? ' done' : ''}`}>
      <button
        className={`todo-check-btn${todo.done ? ' checked' : ''}`}
        onClick={() => onToggle(todo.id)}
        aria-label={todo.done ? '완료 취소' : '완료 처리'}
      >
        {todo.done && (
          <svg viewBox="0 0 12 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1,5 4.5,9 11,1" />
          </svg>
        )}
      </button>

      <div className="todo-body">
        {editing ? (
          <input
            type="text"
            className="edit-input"
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        ) : (
          <span className="todo-text">{todo.text}</span>
        )}
        {todo.done && !editing && <span className="done-label">완료</span>}
      </div>

      <div className="todo-actions">
        {!editing && (
          <button className="btn btn-icon" aria-label="수정" onClick={() => { setEditValue(todo.text); setEditing(true) }}>
            ✎
          </button>
        )}
        <button className="btn btn-icon danger" aria-label="삭제" onClick={() => onDelete(todo.id)}>
          ✕
        </button>
      </div>
    </li>
  )
}

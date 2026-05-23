import { useState } from 'react'

export default function TodoItem({ todo, onToggle, onDelete, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(todo.text)

  function commitEdit() {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== todo.text) {
      onUpdate(todo.id, trimmed)
    }
    setEditing(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') { e.preventDefault(); commitEdit() }
    if (e.key === 'Escape') { setEditValue(todo.text); setEditing(false) }
  }

  function startEditing() {
    setEditValue(todo.text)
    setEditing(true)
  }

  return (
    <li className={`todo-item${todo.done ? ' done' : ''}`}>
      <input
        type="checkbox"
        className="todo-check"
        checked={todo.done}
        onChange={() => onToggle(todo.id)}
        aria-label="완료 처리"
      />

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

      <div className="todo-actions">
        {!editing && (
          <button className="btn btn-icon" aria-label="수정" onClick={startEditing}>
            ✎
          </button>
        )}
        <button
          className="btn btn-icon danger"
          aria-label="삭제"
          onClick={() => onDelete(todo.id)}
        >
          ✕
        </button>
      </div>
    </li>
  )
}

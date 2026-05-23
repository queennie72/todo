import TodoItem from './TodoItem'

export default function TodoList({ todos, onToggle, onDelete, onUpdate }) {
  if (todos.length === 0) {
    return (
      <ul className="todo-list">
        <li className="empty-state">할 일이 없습니다.</li>
      </ul>
    )
  }

  return (
    <ul className="todo-list">
      {todos.map(todo => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onToggle={onToggle}
          onDelete={onDelete}
          onUpdate={onUpdate}
        />
      ))}
    </ul>
  )
}

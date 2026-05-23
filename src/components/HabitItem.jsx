export default function HabitItem({ habit, onToggle }) {
  return (
    <li className={`habit-item${habit.done ? ' done' : ''}`}>
      <button
        className={`habit-check-btn${habit.done ? ' checked' : ''}`}
        onClick={() => onToggle(habit.id)}
        aria-label={habit.done ? '완료 취소' : '완료'}
      >
        {habit.done && (
          <svg viewBox="0 0 12 10" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1,5 4.5,9 11,1" />
          </svg>
        )}
      </button>
      <span className="habit-text">{habit.text}</span>
      {habit.done && <span className="habit-done-badge">완료</span>}
    </li>
  )
}

import { useState } from 'react'

export default function AddForm({ onAdd }) {
  const [value, setValue] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    const text = value.trim()
    if (!text) return
    onAdd(text)
    setValue('')
  }

  return (
    <form className="add-form" onSubmit={handleSubmit}>
      <input
        type="text"
        className="add-input"
        placeholder="할 일을 입력하세요..."
        value={value}
        onChange={e => setValue(e.target.value)}
        autoComplete="off"
      />
      <button type="submit" className="btn btn-add">추가</button>
    </form>
  )
}

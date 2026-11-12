import { useId, useState, type KeyboardEvent } from 'react'

interface Props {
  label: string
  value: string
  /** Called with the text exactly as typed; return false to reject (the field reverts). */
  onCommit: (value: string) => boolean
}

/** Text input that commits on Enter or blur and reverts on Esc or rejection. */
export function TextField({ label, value, onCommit }: Props) {
  const id = useId()
  const [text, setText] = useState(value)
  const [shown, setShown] = useState(value)
  if (shown !== value) {
    setShown(value)
    setText(value)
  }

  const commit = () => {
    if (text === value) return
    if (!onCommit(text)) setText(value)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      commit()
      e.currentTarget.select()
    } else if (e.key === 'Escape') {
      setText(value)
      e.currentTarget.blur()
    }
  }

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <span className="field-input">
        <input
          id={id}
          className="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={onKeyDown}
        />
      </span>
    </div>
  )
}

import { useId, useState, type KeyboardEvent } from 'react'

interface Props {
  label: string
  value: number
  /** Called with a parsed integer; return false to reject (the field reverts). */
  onCommit: (value: number) => boolean
  disabled?: boolean
  unit?: string
}

/**
 * Integer input that commits on Enter or blur and reverts on Esc or rejection.
 * Shows the latest model value whenever it changes from outside.
 */
export function NumberField({ label, value, onCommit, disabled, unit = 'mm' }: Props) {
  const id = useId()
  const [text, setText] = useState(String(value))
  const [shown, setShown] = useState(value)
  if (shown !== value) {
    setShown(value)
    setText(String(value))
  }

  const commit = () => {
    const trimmed = text.trim()
    if (trimmed === String(value)) return
    const parsed = /^-?\d+$/.test(trimmed) ? Number(trimmed) : NaN
    if (Number.isNaN(parsed) || !onCommit(parsed)) setText(String(value))
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      commit()
      e.currentTarget.select()
    } else if (e.key === 'Escape') {
      setText(String(value))
      e.currentTarget.blur()
    }
  }

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <span className="field-input">
        <input
          id={id}
          inputMode="numeric"
          value={text}
          disabled={disabled}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={onKeyDown}
        />
        <span className="unit">{unit}</span>
      </span>
    </div>
  )
}

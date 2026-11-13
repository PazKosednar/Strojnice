import { useId, useState, type KeyboardEvent } from 'react'

interface Props {
  label: string
  /** null shows an empty field (value not entered yet). */
  value: number | null
  /** Called with a parsed integer; return false to reject (the field reverts). */
  onCommit: (value: number) => boolean
  disabled?: boolean
  unit?: string
  /** When given, an empty field is allowed and means "not entered" (return false to reject). */
  onClear?: () => boolean
  autoFocus?: boolean
}

const asText = (value: number | null) => (value === null ? '' : String(value))

/**
 * Integer input that commits on Enter or blur and reverts on Esc or rejection.
 * Shows the latest model value whenever it changes from outside.
 */
export function NumberField({
  label,
  value,
  onCommit,
  disabled,
  unit = 'mm',
  onClear,
  autoFocus,
}: Props) {
  const id = useId()
  const [text, setText] = useState(asText(value))
  const [shown, setShown] = useState(value)
  if (shown !== value) {
    setShown(value)
    setText(asText(value))
  }

  const commit = () => {
    const trimmed = text.trim()
    if (trimmed === asText(value)) return
    if (trimmed === '' && onClear) {
      if (!onClear()) setText(asText(value))
      return
    }
    const parsed = /^-?\d+$/.test(trimmed) ? Number(trimmed) : NaN
    if (Number.isNaN(parsed) || !onCommit(parsed)) setText(asText(value))
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      commit()
      e.currentTarget.select()
    } else if (e.key === 'Escape') {
      setText(asText(value))
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
          autoFocus={autoFocus}
          onFocus={(e) => autoFocus && e.currentTarget.select()}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={onKeyDown}
        />
        <span className="unit">{unit}</span>
      </span>
    </div>
  )
}

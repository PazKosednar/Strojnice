import { useState, type SubmitEvent } from 'react'
import { createRectangularRoom } from '../core/rectangularRoom'
import { addWalls } from '../core/wallOps'
import { useEditorStore } from '../stores/editorStore'
import { newId } from './newId'
import { newRoomOrigin } from './roomPlacement'

const parseMm = (text: string) => (/^\d+$/.test(text.trim()) ? Number(text.trim()) : NaN)

/** Quick input: rectangular room from inner axis width × depth (mm). */
export function RectRoomForm({ onDone }: { onDone: () => void }) {
  const apply = useEditorStore((s) => s.apply)
  const setMessage = useEditorStore((s) => s.setMessage)
  const [width, setWidth] = useState('')
  const [depth, setDepth] = useState('')

  const submit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    const w = parseMm(width)
    const d = parseMm(depth)
    if (!(w > 0) || !(d > 0)) {
      setMessage('Vnesi širino in globino prostora kot celi števili v mm, večji od 0.')
      return
    }
    const ok = apply((scene) =>
      addWalls(scene, createRectangularRoom(w, d, scene.settings, newId, newRoomOrigin(scene))),
    )
    if (ok) onDone()
  }

  return (
    <form className="rect-room-form" onSubmit={submit} aria-label="Pravokoten prostor">
      <label>
        Širina
        <input
          inputMode="numeric"
          value={width}
          onChange={(e) => setWidth(e.target.value)}
          autoFocus
        />
      </label>
      <span>×</span>
      <label>
        Globina
        <input inputMode="numeric" value={depth} onChange={(e) => setDepth(e.target.value)} />
      </label>
      <span className="unit">mm (os sten)</span>
      <button type="submit">Dodaj</button>
      <button type="button" onClick={onDone}>
        Prekliči
      </button>
    </form>
  )
}

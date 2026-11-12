import type { Wall } from '../core/scene'
import { wallLength } from '../core/wallGeometry'
import { removeWall, setWallLength, updateWall } from '../core/wallOps'
import { useEditorStore } from '../stores/editorStore'
import { NumberField } from './NumberField'

export function WallProperties({ wall }: { wall: Wall }) {
  const apply = useEditorStore((s) => s.apply)
  const openings = useEditorStore(
    (s) => s.history.present.openings.filter((o) => o.wallId === wall.id).length,
  )

  return (
    <>
      <h2>Stena</h2>
      <NumberField
        label="Dolžina"
        value={Math.round(wallLength(wall))}
        onCommit={(v) => apply((s) => setWallLength(s, wall.id, v))}
      />
      <NumberField
        label="Debelina"
        value={wall.thickness}
        onCommit={(v) => apply((s) => updateWall(s, wall.id, { thickness: v }))}
      />
      <NumberField
        label="Višina"
        value={wall.height}
        onCommit={(v) => apply((s) => updateWall(s, wall.id, { height: v }))}
      />
      <p className="muted small">
        Začetek ({wall.start.x}, {wall.start.y}) · konec ({wall.end.x}, {wall.end.y})
        <br />
        Sprememba dolžine premakne konec stene. Odprtin: {openings}.
      </p>
      <button type="button" onClick={() => apply((s) => removeWall(s, wall.id))}>
        Izbriši steno
      </button>
    </>
  )
}

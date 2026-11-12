import { useEffect, useState, type ReactNode } from 'react'
import { addEquipment } from '../core/equipmentOps'
import type { EquipmentPlacement } from '../core/equipmentSnap'
import { newId } from '../editor/newId'
import { selectScene, useEditorStore } from '../stores/editorStore'
import { placementAt } from './equipmentPlacement'
import { EquipmentShape } from './PlanEquipment'
import { isTyping, type PointerInfo } from './toolTypes'
import type { View } from './viewport'

/** Equipment tool: shows an outline following the cursor (snapping to walls) and places on click. */
export function useEquipmentTool(active: boolean) {
  const scene = useEditorStore(selectScene)
  const type = useEditorStore((s) => s.placingType)
  const [ghost, setGhost] = useState<EquipmentPlacement | null>(null)
  /** Rotation used away from walls; R turns it by 90°. */
  const [rotation, setRotation] = useState(0)

  const [wasActive, setWasActive] = useState(active)
  if (wasActive !== active) {
    setWasActive(active)
    setGhost(null)
    setRotation(0)
  }

  useEffect(() => {
    if (!active) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTyping(e.target) || e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key.toLowerCase() !== 'r') return
      e.preventDefault()
      setRotation((r) => (r + 90) % 360)
      setGhost((g) => (g && g.wallId === null ? { ...g, rotation: (g.rotation + 90) % 360 } : g))
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [active])

  const placement = (info: PointerInfo) =>
    type &&
    placementAt(type, info.world, scene, {
      snapDistance: info.snapDistance,
      free: info.altKey,
      rotation,
    })

  return {
    hint: type
      ? `Klikni v tloris za postavitev naprave »${type.name}«. Ob steni se prisloni na steno. R zasuka za 90°, Alt izklopi snap, Esc prekliče.`
      : 'V katalogu izberi tip naprave (gumb »Postavi«).',
    pointerMove(info: PointerInfo) {
      setGhost(placement(info) || null)
    },
    pointerDown(info: PointerInfo) {
      const place = placement(info)
      if (!type || !place) return
      const { apply, select, setTool } = useEditorStore.getState()
      const id = newId()
      const placed = apply((s) =>
        addEquipment(s, { id, type, position: place.position, rotation: place.rotation }),
      )
      if (!placed) return
      // Back to the select tool with the new item selected, so it can be adjusted at once.
      setTool('select')
      select({ kind: 'equipment', id })
    },
    renderOverlay(view: View): ReactNode {
      if (!active || !type || !ghost) return null
      const systemColors = new Map(scene.settings.systems.map((s) => [s.id, s.color]))
      return (
        <EquipmentShape
          ghost
          view={view}
          systemColors={systemColors}
          showClearances
          equipment={{
            id: 'ghost',
            tag: type.tagPrefix,
            type,
            position: ghost.position,
            rotation: ghost.rotation,
            elevation: 0,
          }}
        />
      )
    },
  }
}

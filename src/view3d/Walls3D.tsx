import { Edges } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import type { Group, Mesh, MeshStandardMaterial, Vector3 } from 'three'
import type { Box3d } from '../core/sceneToBoxes'
import type { WallFacing } from '../core/wallVisibility'
import { isTopView, isWallHidden } from '../core/wallVisibility'
import type { WallViewMode } from '../stores/editorStore'

const COLORS = { wall: '#d9d6cf', selected: '#9cc0ff', edges: '#6b7280' }
/** Opacity of front walls in the "transparent" mode. */
const TRANSPARENT_OPACITY = 0.18

interface Props {
  /** Wall pieces (from sceneToBoxes, kind 'wall'). */
  boxes: readonly Box3d[]
  /** Low base pieces (wallBaseBoxes). */
  baseBoxes: readonly Box3d[]
  facings: readonly WallFacing[]
  mode: WallViewMode
  selectedWallId: string | null
}

/** OrbitControls target, when the controls expose it. */
interface WithTarget {
  target?: Vector3
}

/**
 * Walls with the clean view: walls between the camera and the room are hidden (or made
 * transparent) while the view turns, leaving a low base; from above, all walls show only
 * their base. Visibility is decided every rendered frame from the camera position and
 * applied directly to the three.js objects, so nothing is written to the store and React
 * does not re-render. Only walls change: equipment, terminals and pipes stay visible.
 */
export function Walls3D({ boxes, baseBoxes, facings, mode, selectedWallId }: Props) {
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls) as unknown as WithTarget | null
  const invalidate = useThree((s) => s.invalidate)
  const full = useRef(new Map<string, Group>())
  const base = useRef(new Map<string, Group>())
  const hidden = useRef(new Map<string, boolean>())
  const top = useRef(false)

  const wallIds = useMemo(() => [...new Set(boxes.map((b) => b.elementId))], [boxes])
  const byWall = (list: readonly Box3d[], id: string) => list.filter((b) => b.elementId === id)

  // A new mode or geometry must be applied at once, not only on the next camera move.
  useEffect(() => invalidate(), [mode, boxes, invalidate])

  useFrame(() => {
    const cam = {
      x: camera.position.x * 1000,
      y: -camera.position.z * 1000,
      z: camera.position.y * 1000,
    }
    const t = controls?.target
    const target = t ? { x: t.x * 1000, y: -t.z * 1000, z: t.y * 1000 } : { x: 0, y: 0, z: 0 }
    top.current = mode !== 'all' && isTopView(cam, target, top.current)

    for (const facing of facings) {
      const wasHidden = hidden.current.get(facing.id) ?? false
      const isHidden =
        mode !== 'all' && (top.current || isWallHidden(facing, { ...cam }, wasHidden))
      hidden.current.set(facing.id, isHidden)

      const fullGroup = full.current.get(facing.id)
      const baseGroup = base.current.get(facing.id)
      if (!fullGroup || !baseGroup) continue
      if (mode === 'transparent' && isHidden && !top.current) {
        fullGroup.visible = true
        setOpacity(fullGroup, TRANSPARENT_OPACITY)
        baseGroup.visible = false
      } else {
        fullGroup.visible = !isHidden
        setOpacity(fullGroup, 1)
        baseGroup.visible = isHidden
      }
    }
  })

  return (
    <group>
      {wallIds.map((id) => {
        const color = id === selectedWallId ? COLORS.selected : COLORS.wall
        return (
          <group key={id}>
            <group
              ref={(g) => {
                if (g) full.current.set(id, g)
                else full.current.delete(id)
              }}
            >
              {byWall(boxes, id).map((box) => (
                <mesh key={box.key} position={box.center} rotation-y={box.rotationY}>
                  <boxGeometry args={box.size} />
                  <meshStandardMaterial color={color} roughness={0.9} transparent />
                  <Edges color={COLORS.edges} />
                </mesh>
              ))}
            </group>
            <group
              visible={false}
              ref={(g) => {
                if (g) base.current.set(id, g)
                else base.current.delete(id)
              }}
            >
              {byWall(baseBoxes, id).map((box) => (
                <mesh key={box.key} position={box.center} rotation-y={box.rotationY}>
                  <boxGeometry args={box.size} />
                  <meshStandardMaterial color={color} roughness={0.9} />
                  <Edges color={COLORS.edges} />
                </mesh>
              ))}
            </group>
          </group>
        )
      })}
    </group>
  )
}

function setOpacity(group: Group, opacity: number) {
  group.traverse((object) => {
    const mesh = object as Mesh
    const material = mesh.material as MeshStandardMaterial | undefined
    if (!mesh.isMesh || !material || !('opacity' in material)) return
    if (material.opacity !== opacity) {
      material.opacity = opacity
      // Fully transparent-sorted walls would hide pipes behind them; write depth only when opaque.
      material.depthWrite = opacity === 1
    }
  })
}

import { Edges } from '@react-three/drei'
import type { SpaceBox3d, Vec3 } from '../core/sceneToBoxes'
import { TagLabel } from './TagLabel'

const ZONE_COLORS = {
  forbidden: '#dc2626',
  avoid: '#ea580c',
  preferred: '#16a34a',
} as const

interface Props {
  boxes: readonly SpaceBox3d[]
  selectedId: string | null
}

/** Obstacles (grey, with tag and name) and zones (transparent red / orange / green). */
export function Space3D({ boxes, selectedId }: Props) {
  return (
    <group>
      {boxes.map((box) => {
        const selected = box.id === selectedId
        if (box.kind === 'obstacle') {
          return (
            <group key={box.id}>
              <mesh position={box.center} rotation-y={box.rotationY}>
                <boxGeometry args={box.size} />
                <meshStandardMaterial color={selected ? '#9cc0ff' : '#9ca3af'} roughness={0.8} />
                <Edges color="#374151" />
              </mesh>
              <TagLabel text={box.label} position={box.labelPosition} />
            </group>
          )
        }
        const color = ZONE_COLORS[box.kind]
        return (
          <mesh key={box.id} position={box.center} rotation-y={box.rotationY} renderOrder={2}>
            <boxGeometry args={box.size} />
            <meshBasicMaterial color={color} transparent opacity={0.12} depthWrite={false} />
            <Edges color={selected ? '#2563eb' : color} />
          </mesh>
        )
      })}
    </group>
  )
}

/** Marker of a highlighted place (e.g. a rule violation): a red ball drawn on top. */
export function Highlight3D({ position }: { position: Vec3 | null }) {
  if (!position) return null
  return (
    <mesh position={position} renderOrder={20}>
      <sphereGeometry args={[0.06, 20, 14]} />
      <meshBasicMaterial color="#dc2626" depthTest={false} transparent opacity={0.85} />
    </mesh>
  )
}

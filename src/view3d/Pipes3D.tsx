import { useMemo } from 'react'
import { Matrix4, Quaternion, Vector3 } from 'three'
import type { PipeElbow3d, PipeSegment3d, Pipes3d } from '../core/pipesTo3d'
import type { PipeLook } from '../stores/editorStore'

const UP = new Vector3(0, 1, 0)
const COPPER = '#c27a4a'
const SELECTED = '#2563eb'

interface MaterialProps {
  color: string
  look: PipeLook
  highlight: boolean
  ghost: boolean
}

/** Copper (metallic, reflecting the studio light) or the plain system colour. */
function PipeMaterial({ color, look, highlight, ghost }: MaterialProps) {
  const copper = look === 'copper'
  return (
    <meshStandardMaterial
      color={copper ? COPPER : color}
      metalness={copper ? 0.75 : 0.15}
      roughness={copper ? 0.32 : 0.45}
      emissive={highlight ? SELECTED : '#000000'}
      emissiveIntensity={highlight ? 0.55 : 0}
      transparent={ghost}
      opacity={ghost ? 0.45 : 1}
    />
  )
}

/** Cylinder between two points with the pipe's true outer diameter. */
function Segment({
  segment,
  ...material
}: { segment: PipeSegment3d } & Omit<MaterialProps, 'color'>) {
  const [sx, sy, sz] = segment.start
  const [ex, ey, ez] = segment.end
  const { position, quaternion, length } = useMemo(() => {
    const dir = new Vector3(ex - sx, ey - sy, ez - sz)
    const length = dir.length()
    return {
      position: [(sx + ex) / 2, (sy + ey) / 2, (sz + ez) / 2] as [number, number, number],
      quaternion: new Quaternion().setFromUnitVectors(UP, dir.normalize()),
      length,
    }
  }, [sx, sy, sz, ex, ey, ez])
  if (length < 1e-6) return null
  return (
    <mesh position={position} quaternion={quaternion}>
      <cylinderGeometry args={[segment.radius, segment.radius, length, 20]} />
      <PipeMaterial color={segment.color} {...material} />
    </mesh>
  )
}

/** Smooth bend: a quarter torus turned into the plane of the two runs. */
function Elbow({ elbow, ...material }: { elbow: PipeElbow3d } & Omit<MaterialProps, 'color'>) {
  const matrix = useMemo(() => {
    const x = new Vector3(...elbow.xAxis)
    const y = new Vector3(...elbow.yAxis)
    const z = new Vector3().crossVectors(x, y)
    return new Matrix4().makeBasis(x, y, z).setPosition(...elbow.center)
  }, [elbow.xAxis, elbow.yAxis, elbow.center])
  return (
    <mesh matrix={matrix} matrixAutoUpdate={false}>
      <torusGeometry args={[elbow.bendRadius, elbow.radius, 14, 12, Math.PI / 2]} />
      <PipeMaterial color={elbow.color} {...material} />
    </mesh>
  )
}

interface Props {
  pipes: Pipes3d
  hiddenSystems: readonly string[]
  selectedPipeId: string | null
  look?: PipeLook
  /** Proposed pipes (not yet accepted) are drawn transparent. */
  ghost?: boolean
}

/** Pipes (straight runs, bends) and wall-terminal stubs. */
export function Pipes3D({
  pipes,
  hiddenSystems,
  selectedPipeId,
  look = 'system',
  ghost = false,
}: Props) {
  const visible = (systemId: string) => !hiddenSystems.includes(systemId)
  return (
    <group>
      {pipes.segments
        .filter((s) => visible(s.systemId))
        .map((s) => (
          <Segment
            key={s.key}
            segment={s}
            look={look}
            highlight={s.pipeId === selectedPipeId}
            ghost={ghost}
          />
        ))}
      {pipes.elbows
        .filter((e) => visible(e.systemId))
        .map((e) => (
          <Elbow
            key={e.key}
            elbow={e}
            look={look}
            highlight={e.pipeId === selectedPipeId}
            ghost={ghost}
          />
        ))}
      {pipes.joints
        .filter((j) => visible(j.systemId))
        .map((j) => (
          <mesh key={j.key} position={j.center}>
            <sphereGeometry args={[j.radius, 16, 12]} />
            <PipeMaterial
              color={j.color}
              look={look}
              highlight={j.pipeId === selectedPipeId}
              ghost={ghost}
            />
          </mesh>
        ))}
      {pipes.terminals
        .filter((t) => visible(t.systemId))
        .map((t) => (
          <Segment
            key={t.key}
            segment={{ ...t, radius: t.radius * 1.15 }}
            look="system"
            highlight={false}
            ghost={ghost}
          />
        ))}
    </group>
  )
}

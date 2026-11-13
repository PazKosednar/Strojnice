import { useMemo } from 'react'
import { Quaternion, Vector3 } from 'three'
import type { PipeSegment3d, Pipes3d } from '../core/pipesTo3d'

const UP = new Vector3(0, 1, 0)

/** Cylinder between two points with the pipe's true outer diameter. */
function Segment({ segment, highlight }: { segment: PipeSegment3d; highlight: boolean }) {
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
      <meshStandardMaterial
        color={segment.color}
        roughness={0.45}
        metalness={0.15}
        emissive={highlight ? '#2563eb' : '#000000'}
        emissiveIntensity={highlight ? 0.45 : 0}
      />
    </mesh>
  )
}

interface Props {
  pipes: Pipes3d
  hiddenSystems: readonly string[]
  selectedPipeId: string | null
}

/** Pipes (cylinders and bend spheres) and wall-terminal stubs in their system colours. */
export function Pipes3D({ pipes, hiddenSystems, selectedPipeId }: Props) {
  const visible = (systemId: string) => !hiddenSystems.includes(systemId)
  return (
    <group>
      {pipes.segments
        .filter((s) => visible(s.systemId))
        .map((s) => (
          <Segment key={s.key} segment={s} highlight={s.pipeId === selectedPipeId} />
        ))}
      {pipes.joints
        .filter((j) => visible(j.systemId))
        .map((j) => (
          <mesh key={j.key} position={j.center}>
            <sphereGeometry args={[j.radius, 16, 12]} />
            <meshStandardMaterial
              color={j.color}
              roughness={0.45}
              metalness={0.15}
              emissive={j.pipeId === selectedPipeId ? '#2563eb' : '#000000'}
              emissiveIntensity={j.pipeId === selectedPipeId ? 0.45 : 0}
            />
          </mesh>
        ))}
      {pipes.terminals
        .filter((t) => visible(t.systemId))
        .map((t) => (
          <Segment key={t.key} segment={{ ...t, radius: t.radius * 1.15 }} highlight={false} />
        ))}
    </group>
  )
}

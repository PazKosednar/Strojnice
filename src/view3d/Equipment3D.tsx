import { Edges } from '@react-three/drei'
import { useMemo } from 'react'
import { Quaternion, Vector3 } from 'three'
import type { Equipment3d, Port3d } from '../core/equipmentTo3d'
import { ModelMesh } from './ModelMesh'
import { TagLabel } from './TagLabel'

const COLORS = {
  body: '#c9d6e8',
  selected: '#9cc0ff',
  conflict: '#f1b0b0',
  edges: '#475569',
}

const UP = new Vector3(0, 1, 0)

/** Short stub in the system colour, pointing where the pipe leaves the equipment. */
function PortStub({ port }: { port: Port3d }) {
  const [dx, dy, dz] = port.direction
  // A cylinder's axis is +y; turn it to the port direction.
  const quaternion = useMemo(
    () => new Quaternion().setFromUnitVectors(UP, new Vector3(dx, dy, dz)),
    [dx, dy, dz],
  )
  return (
    <mesh position={port.center} quaternion={quaternion}>
      <cylinderGeometry args={[port.radius, port.radius, port.length, 16]} />
      <meshStandardMaterial color={port.color} roughness={0.6} />
    </mesh>
  )
}

interface Props {
  item: Equipment3d
  selected: boolean
  conflict: boolean
  hiddenSystems: readonly string[]
}

/** One placed equipment item: body in true dimensions, port stubs and the tag label. */
export function Equipment3D({ item, selected, conflict, hiddenSystems }: Props) {
  const color = conflict ? COLORS.conflict : selected ? COLORS.selected : COLORS.body
  const geometry =
    item.shape.kind === 'box' ? (
      <boxGeometry args={item.shape.size} />
    ) : (
      <cylinderGeometry args={[item.shape.radius, item.shape.radius, item.shape.height, 40]} />
    )
  const body = (
    <mesh position={item.center} rotation-y={item.rotationY}>
      {geometry}
      <meshStandardMaterial color={color} roughness={0.75} />
      <Edges color={COLORS.edges} />
    </mesh>
  )
  return (
    <group>
      {item.model ? (
        <>
          <ModelMesh
            path={item.model.path}
            base={item.model.base}
            equipmentRotationY={item.rotationY}
            modelRotationY={item.model.rotationY}
            offset={item.model.offset}
            fallback={body}
          />
          {(selected || conflict) && (
            // Outline of the type dimensions, so selection and conflicts stay visible.
            <mesh position={item.center} rotation-y={item.rotationY}>
              {geometry}
              <meshBasicMaterial visible={false} />
              <Edges color={conflict ? '#dc2626' : '#2563eb'} lineWidth={2} />
            </mesh>
          )}
        </>
      ) : (
        body
      )}
      {item.ports
        .filter((port) => !hiddenSystems.includes(port.systemId))
        .map((port) => (
          <PortStub key={port.key} port={port} />
        ))}
      <TagLabel text={item.tag} position={item.labelPosition} />
    </group>
  )
}

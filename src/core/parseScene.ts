import { readEquipmentType } from './equipmentType'
import { validateOpening } from './openingValidation'
import {
  arr,
  coord,
  int,
  obj,
  oneOf,
  point,
  SceneFormatError,
  str,
  uniqueIds,
} from './parseHelpers'
import { pipeEndKey } from './pipeEnds'
import {
  SCENE_VERSION,
  type Equipment,
  type Opening,
  type OpeningPreset,
  type Pipe,
  type PipeEnd,
  type RoutePoint,
  type Scene,
  type SceneSettings,
  type SystemDef,
  type Wall,
  type WallTerminal,
} from './scene'
import { migrateScene } from './sceneMigrations'

export type ParseSceneResult = { ok: true; scene: Scene } | { ok: false; error: string }

function preset(value: unknown, path: string): OpeningPreset {
  const o = obj(value, path)
  return {
    width: int(o.width, `${path}.width`, 1),
    height: int(o.height, `${path}.height`, 1),
    sillHeight: int(o.sillHeight, `${path}.sillHeight`, 0),
  }
}

function system(value: unknown, path: string): SystemDef {
  const o = obj(value, path)
  const color = str(o.color, `${path}.color`)
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
    throw new SceneFormatError(`${path}.color: expected a colour like "#1f77b4"`)
  }
  return {
    id: str(o.id, `${path}.id`),
    name: str(o.name, `${path}.name`),
    color,
    lineStyle: oneOf(o.lineStyle, `${path}.lineStyle`, ['solid', 'dashed', 'dashdot'] as const),
  }
}

function settings(value: unknown): SceneSettings {
  const o = obj(value, 'settings')
  const systems = arr(o.systems, 'settings.systems').map((s, i) =>
    system(s, `settings.systems[${i}]`),
  )
  uniqueIds(systems, 'settings.systems')
  return {
    wallThickness: int(o.wallThickness, 'settings.wallThickness', 1),
    wallHeight: int(o.wallHeight, 'settings.wallHeight', 1),
    door: preset(o.door, 'settings.door'),
    window: preset(o.window, 'settings.window'),
    gridSize: int(o.gridSize, 'settings.gridSize', 1),
    systems,
    routingGrid: int(o.routingGrid, 'settings.routingGrid', 1),
    portStraight: int(o.portStraight, 'settings.portStraight', 0),
    pipeSpacing: int(o.pipeSpacing, 'settings.pipeSpacing', 0),
  }
}

function wall(value: unknown, path: string): Wall {
  const o = obj(value, path)
  const w: Wall = {
    id: str(o.id, `${path}.id`),
    start: point(o.start, `${path}.start`),
    end: point(o.end, `${path}.end`),
    thickness: int(o.thickness, `${path}.thickness`, 1),
    height: int(o.height, `${path}.height`, 1),
  }
  if (w.start.x === w.end.x && w.start.y === w.end.y) {
    throw new SceneFormatError(`${path}: wall has zero length`)
  }
  return w
}

function opening(value: unknown, path: string): Opening {
  const o = obj(value, path)
  return {
    id: str(o.id, `${path}.id`),
    wallId: str(o.wallId, `${path}.wallId`),
    type: oneOf(o.type, `${path}.type`, ['door', 'window'] as const),
    offset: int(o.offset, `${path}.offset`, 0),
    width: int(o.width, `${path}.width`, 1),
    height: int(o.height, `${path}.height`, 1),
    sillHeight: int(o.sillHeight, `${path}.sillHeight`, 0),
  }
}

function equipment(value: unknown, path: string): Equipment {
  const o = obj(value, path)
  const tag = str(o.tag, `${path}.tag`)
  if (tag !== tag.trim()) {
    throw new SceneFormatError(`${path}.tag: must not start or end with a space`)
  }
  return {
    id: str(o.id, `${path}.id`),
    tag,
    type: readEquipmentType(o.type, `${path}.type`),
    position: point(o.position, `${path}.position`),
    elevation: int(o.elevation, `${path}.elevation`, 0),
    rotation: int(o.rotation, `${path}.rotation`, 0, 359),
  }
}

function terminal(value: unknown, path: string): WallTerminal {
  const o = obj(value, path)
  const tag = str(o.tag, `${path}.tag`)
  if (tag !== tag.trim()) {
    throw new SceneFormatError(`${path}.tag: must not start or end with a space`)
  }
  return {
    id: str(o.id, `${path}.id`),
    tag,
    wallId: str(o.wallId, `${path}.wallId`),
    offset: int(o.offset, `${path}.offset`, 0),
    height: int(o.height, `${path}.height`, 0),
    systemId: str(o.systemId, `${path}.systemId`),
    outerDiameter: int(o.outerDiameter, `${path}.outerDiameter`, 1),
  }
}

function pipeEnd(value: unknown, path: string): PipeEnd {
  const o = obj(value, path)
  const kind = oneOf(o.kind, `${path}.kind`, ['port', 'terminal'] as const)
  return kind === 'port'
    ? {
        kind,
        equipmentId: str(o.equipmentId, `${path}.equipmentId`),
        portId: str(o.portId, `${path}.portId`),
      }
    : { kind, terminalId: str(o.terminalId, `${path}.terminalId`) }
}

function routePoint(value: unknown, path: string): RoutePoint {
  const o = obj(value, path)
  return { x: coord(o.x, `${path}.x`), y: coord(o.y, `${path}.y`), z: coord(o.z, `${path}.z`) }
}

function pipe(value: unknown, path: string): Pipe {
  const o = obj(value, path)
  const route = arr(o.route, `${path}.route`).map((p, i) => routePoint(p, `${path}.route[${i}]`))
  route.forEach((p, i) => {
    const prev = route[i - 1]
    if (!prev) return
    const changed = Number(p.x !== prev.x) + Number(p.y !== prev.y) + Number(p.z !== prev.z)
    if (changed !== 1) {
      throw new SceneFormatError(`${path}.route[${i}]: segments must be axis-parallel`)
    }
  })
  const result: Pipe = {
    id: str(o.id, `${path}.id`),
    systemId: str(o.systemId, `${path}.systemId`),
    from: pipeEnd(o.from, `${path}.from`),
    to: pipeEnd(o.to, `${path}.to`),
    outerDiameter: int(o.outerDiameter, `${path}.outerDiameter`, 1),
    route,
    mode: oneOf(o.mode, `${path}.mode`, ['auto', 'manual'] as const),
  }
  if (typeof o.routeError === 'string' && o.routeError !== '') result.routeError = o.routeError
  return result
}

function checkPipeEnds(
  pipes: readonly Pipe[],
  equipment: readonly Equipment[],
  terminals: readonly WallTerminal[],
) {
  const used = new Set<string>()
  pipes.forEach((p, i) => {
    const ends: [string, PipeEnd][] = [
      ['from', p.from],
      ['to', p.to],
    ]
    for (const [name, end] of ends) {
      const path = `pipes[${i}].${name}`
      if (end.kind === 'port') {
        const item = equipment.find((e) => e.id === end.equipmentId)
        if (!item) throw new SceneFormatError(`${path}: unknown equipment "${end.equipmentId}"`)
        if (!item.type.ports.some((port) => port.id === end.portId)) {
          throw new SceneFormatError(`${path}: unknown port "${end.portId}"`)
        }
      } else if (!terminals.some((t) => t.id === end.terminalId)) {
        throw new SceneFormatError(`${path}: unknown terminal "${end.terminalId}"`)
      }
      const key = pipeEndKey(end)
      if (used.has(key)) throw new SceneFormatError(`${path}: end already has a pipe`)
      used.add(key)
    }
  })
}

function parse(json: unknown): Scene {
  const root = obj(migrateScene(json), 'scene')
  if (root.version !== SCENE_VERSION) {
    throw new SceneFormatError(`version: unsupported scene version ${String(root.version)}`)
  }
  if (root.units !== 'mm') throw new SceneFormatError('units: expected "mm"')

  const walls = arr(root.walls, 'walls').map((w, i) => wall(w, `walls[${i}]`))
  const openings = arr(root.openings, 'openings').map((o, i) => opening(o, `openings[${i}]`))
  const items = arr(root.equipment, 'equipment').map((e, i) => equipment(e, `equipment[${i}]`))
  const terminals = arr(root.terminals, 'terminals').map((t, i) => terminal(t, `terminals[${i}]`))
  const pipes = arr(root.pipes, 'pipes').map((p, i) => pipe(p, `pipes[${i}]`))
  uniqueIds([...walls, ...openings, ...items, ...terminals, ...pipes], 'ids')

  openings.forEach((o, i) => {
    const host = walls.find((w) => w.id === o.wallId)
    if (!host) throw new SceneFormatError(`openings[${i}].wallId: unknown wall "${o.wallId}"`)
    const error = validateOpening(o, host, openings)
    if (error) throw new SceneFormatError(`openings[${i}]: ${error}`)
  })

  const tags = new Set<string>()
  const tagged = [
    ...items.map((item, i) => ({ tag: item.tag, path: `equipment[${i}].tag` })),
    ...terminals.map((t, i) => ({ tag: t.tag, path: `terminals[${i}].tag` })),
  ]
  for (const { tag, path } of tagged) {
    if (tags.has(tag)) throw new SceneFormatError(`${path}: duplicate tag "${tag}"`)
    tags.add(tag)
  }
  terminals.forEach((t, i) => {
    if (!walls.some((w) => w.id === t.wallId)) {
      throw new SceneFormatError(`terminals[${i}].wallId: unknown wall "${t.wallId}"`)
    }
  })
  checkPipeEnds(pipes, items, terminals)

  return {
    version: SCENE_VERSION,
    units: 'mm',
    settings: settings(root.settings),
    walls,
    openings,
    equipment: items,
    terminals,
    pipes,
  }
}

/**
 * Validates stored JSON and returns a typed scene of the current version. Older versions
 * are upgraded first. Invalid or unknown data is rejected with a message naming the
 * offending field instead of crashing the app.
 */
export function parseScene(json: unknown): ParseSceneResult {
  try {
    return { ok: true, scene: parse(json) }
  } catch (err) {
    if (err instanceof SceneFormatError) return { ok: false, error: err.message }
    throw err
  }
}

import { isValidPlanBox, normalizedPlanBox } from './planBox'
import type { Obstacle, Scene } from './scene'
import { fail, ok, type SceneResult } from './sceneResult'
import { allTags, isTagFree, nextTag } from './tags'

/** Prefix of automatically assigned obstacle tags. */
export const OBSTACLE_TAG_PREFIX = 'OV'

function validated(scene: Scene, obstacle: Obstacle): SceneResult | Obstacle {
  if (obstacle.tag === '' || obstacle.tag !== obstacle.tag.trim()) return fail('tagEmpty')
  if (!isTagFree(allTags(scene), obstacle.tag, obstacle.id)) return fail('tagTaken')
  if (!isValidPlanBox(obstacle)) return fail('invalidBox')
  return obstacle
}

export type NewObstacle = Omit<Obstacle, 'tag'> & { tag?: string }

/** Adds an obstacle; without a tag it gets the next OV-NN. */
export function addObstacle(scene: Scene, input: NewObstacle): SceneResult {
  const tag =
    input.tag ??
    nextTag(
      OBSTACLE_TAG_PREFIX,
      allTags(scene).map((t) => t.tag),
    )
  const obstacle = validated(scene, normalizedPlanBox({ ...input, tag }))
  if ('ok' in obstacle) return obstacle
  return ok({ ...scene, obstacles: [...scene.obstacles, obstacle] })
}

export type ObstaclePatch = Partial<Omit<Obstacle, 'id'>>

/** Changes an obstacle. The tag is stored exactly as given (unique, not empty). */
export function updateObstacle(scene: Scene, id: string, patch: ObstaclePatch): SceneResult {
  const current = scene.obstacles.find((o) => o.id === id)
  if (!current) return fail('notFound')
  const obstacle = validated(scene, normalizedPlanBox({ ...current, ...patch }))
  if ('ok' in obstacle) return obstacle
  return ok({ ...scene, obstacles: scene.obstacles.map((o) => (o.id === id ? obstacle : o)) })
}

export function removeObstacle(scene: Scene, id: string): SceneResult {
  if (!scene.obstacles.some((o) => o.id === id)) return fail('notFound')
  return ok({ ...scene, obstacles: scene.obstacles.filter((o) => o.id !== id) })
}

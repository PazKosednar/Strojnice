import type { Point } from './scene'

/** Thrown while reading stored JSON; the message starts with the path of the bad value. */
export class SceneFormatError extends Error {}

export type Obj = Record<string, unknown>

export function obj(value: unknown, path: string): Obj {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new SceneFormatError(`${path}: expected an object`)
  }
  return value as Obj
}

export function int(value: unknown, path: string, min: number, max = Infinity): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    const range = max === Infinity ? `>= ${min}` : `between ${min} and ${max}`
    throw new SceneFormatError(`${path}: expected an integer ${range}`)
  }
  return value
}

/** Any (safe) integer, negative included. */
export function coord(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new SceneFormatError(`${path}: expected an integer`)
  }
  return value
}

export function str(value: unknown, path: string): string {
  if (typeof value !== 'string' || value === '') {
    throw new SceneFormatError(`${path}: expected a non-empty string`)
  }
  return value
}

export function text(value: unknown, path: string): string {
  if (typeof value !== 'string') throw new SceneFormatError(`${path}: expected a string`)
  return value
}

export function arr(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) throw new SceneFormatError(`${path}: expected an array`)
  return value
}

export function oneOf<T extends string>(value: unknown, path: string, options: readonly T[]): T {
  if (typeof value !== 'string' || !options.includes(value as T)) {
    const list = options.map((o) => `"${o}"`).join(', ')
    throw new SceneFormatError(`${path}: expected one of ${list}`)
  }
  return value as T
}

export function point(value: unknown, path: string): Point {
  const o = obj(value, path)
  return { x: coord(o.x, `${path}.x`), y: coord(o.y, `${path}.y`) }
}

export function uniqueIds(items: readonly { id: string }[], path: string) {
  const seen = new Set<string>()
  for (const item of items) {
    if (seen.has(item.id)) throw new SceneFormatError(`${path}: duplicate id "${item.id}"`)
    seen.add(item.id)
  }
}

/**
 * Tuning constants of automatic routing. Costs are in "millimetres of pipe": a value of
 * 300 means the router accepts up to 300 mm of extra length to avoid it.
 * These are starting values chosen for this app, not values from a standard.
 */
export const ROUTING_COSTS = {
  /** Extra cost of every bend (elbow). */
  bend: 300,
  /**
   * Distance-from-wall weight: each mm of pipe costs 1 + weight × min(distance to the
   * nearest wall face, cap) / cap. Pipes therefore prefer to run along walls.
   */
  wallDistanceWeight: 0.5,
  wallDistanceCap: 600,
  /** Cost of entering a wall body (one wall penetration). */
  wallCrossing: 3000,
  /** Cost factor per mm of pipe inside a wall body (discourages running inside walls). */
  inWallFactor: 4,
  /** Cost factor per mm of pipe inside the clearance zone of other equipment. */
  clearanceFactor: 5,
} as const

/** Limits that keep routing fast and bounded (see docs/zasnova.md, faza 3). */
export const ROUTING_LIMITS = {
  /** Free space added around the scene in plan (mm). */
  margin: 1000,
  /** Largest grid (nodes); bigger scenes are routed with a coarser grid. */
  maxNodes: 600_000,
  /** The grid is never coarsened beyond this step (mm). */
  maxGridStep: 200,
  /** Time budget for one pipe (ms). */
  timeBudgetMs: 2000,
  /** Maximum number of expanded search states for one pipe. */
  maxExpansions: 3_000_000,
  /** How often the clock is checked (expansions). */
  clockEvery: 4096,
} as const

export type RoutingCosts = { -readonly [K in keyof typeof ROUTING_COSTS]: number }
export type RoutingLimits = { -readonly [K in keyof typeof ROUTING_LIMITS]: number }

// Development-only state of the 3D clean view, written by Walls3D for browser tests.
export {}

declare global {
  interface Window {
    __cleanView?: {
      hidden: Record<string, boolean>
      top: boolean
      /** Camera position in plan mm (x, y) and height (z). */
      camera: { x: number; y: number; z: number }
    }
  }
}

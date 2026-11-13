// Development-only state of the 3D clean view, written by Walls3D for browser tests.
export {}

declare global {
  interface Window {
    __cleanView?: { hidden: Record<string, boolean>; top: boolean }
  }
}

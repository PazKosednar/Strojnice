import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  // Pre-bundle the lazily loaded 3D stack so opening the 3D view does not trigger a
  // dev-server dependency re-optimisation (which reloads the page).
  optimizeDeps: {
    include: ['three', '@react-three/fiber', '@react-three/drei'],
  },
  test: {
    projects: [
      {
        // Pure geometry core: no DOM available, by design.
        test: {
          name: 'core',
          environment: 'node',
          include: ['src/core/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'app',
          environment: 'jsdom',
          include: ['src/**/*.test.{ts,tsx}'],
          exclude: ['src/core/**'],
          setupFiles: ['./src/test/setup.ts'],
        },
      },
    ],
  },
})

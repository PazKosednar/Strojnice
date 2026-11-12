// Runs Vitest with normalised paths.
// On Windows a folder opened as "c:\..." (lowercase drive, e.g. from VS Code) makes
// Vitest load its runner twice, so every suite fails with
// "Cannot read properties of undefined (reading 'config')".
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const upperDrive = (path) => path.replace(/^[a-z]:/, (drive) => drive.toUpperCase())

const cwd = upperDrive(process.cwd())
const vitestBin = upperDrive(
  fileURLToPath(new URL('../node_modules/vitest/vitest.mjs', import.meta.url)),
)

const result = spawnSync(process.execPath, [vitestBin, ...process.argv.slice(2)], {
  cwd,
  stdio: 'inherit',
})
process.exit(result.status ?? 1)

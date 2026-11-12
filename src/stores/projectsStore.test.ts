import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ProjectSummary } from '../lib/projectsApi'
import { useProjectsStore } from './projectsStore'

vi.mock('../lib/projectsApi', () => ({
  listProjects: vi.fn(),
  createProject: vi.fn(),
  renameProject: vi.fn(),
  deleteProject: vi.fn(),
}))

const { listProjects } = await import('../lib/projectsApi')

const project = (id: string): ProjectSummary => ({
  id,
  name: `Projekt ${id}`,
  created_at: '2026-11-12T10:00:00Z',
  updated_at: '2026-11-12T10:00:00Z',
})

describe('projectsStore', () => {
  afterEach(() => {
    useProjectsStore.getState().reset()
    vi.mocked(listProjects).mockReset()
  })

  it('reset() clears cached projects and errors', async () => {
    vi.mocked(listProjects).mockResolvedValue([project('a')])
    await useProjectsStore.getState().load()
    expect(useProjectsStore.getState().projects).toHaveLength(1)

    useProjectsStore.getState().reset()

    expect(useProjectsStore.getState()).toMatchObject({ projects: [], error: null, loading: false })
  })

  it('discards a load that finishes after reset (previous user)', async () => {
    let resolve!: (value: ProjectSummary[]) => void
    vi.mocked(listProjects).mockReturnValue(new Promise((r) => (resolve = r)))

    const pending = useProjectsStore.getState().load()
    useProjectsStore.getState().reset()
    resolve([project('of-previous-user')])
    await pending

    expect(useProjectsStore.getState().projects).toEqual([])
  })
})

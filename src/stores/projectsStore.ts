import { create } from 'zustand'
import { actionErrorMessage } from '../lib/errors'
import {
  createProject,
  deleteProject,
  listProjects,
  renameProject,
  type ProjectSummary,
} from '../lib/projectsApi'

interface ProjectsState {
  projects: ProjectSummary[]
  loading: boolean
  /** Slovenian error message of the last failed action. */
  error: string | null
  load: () => Promise<void>
  create: (name: string) => Promise<boolean>
  rename: (id: string, name: string) => Promise<boolean>
  remove: (id: string) => Promise<boolean>
  clearError: () => void
}

export const useProjectsStore = create<ProjectsState>()((set) => ({
  projects: [],
  loading: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null })
    try {
      set({ projects: await listProjects() })
    } catch (err) {
      set({ error: actionErrorMessage('Projektov ni bilo mogoče naložiti', err) })
    } finally {
      set({ loading: false })
    }
  },

  create: async (name) => {
    try {
      const project = await createProject(name)
      set((s) => ({ projects: [project, ...s.projects], error: null }))
      return true
    } catch (err) {
      set({ error: actionErrorMessage('Projekta ni bilo mogoče ustvariti', err) })
      return false
    }
  },

  rename: async (id, name) => {
    try {
      const updated = await renameProject(id, name)
      set((s) => ({
        projects: s.projects.map((p) => (p.id === id ? updated : p)),
        error: null,
      }))
      return true
    } catch (err) {
      set({ error: actionErrorMessage('Projekta ni bilo mogoče preimenovati', err) })
      return false
    }
  },

  remove: async (id) => {
    try {
      await deleteProject(id)
      set((s) => ({ projects: s.projects.filter((p) => p.id !== id), error: null }))
      return true
    } catch (err) {
      set({ error: actionErrorMessage('Projekta ni bilo mogoče izbrisati', err) })
      return false
    }
  },

  clearError: () => set({ error: null }),
}))

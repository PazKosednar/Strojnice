import { useEffect } from 'react'
import { CreateProjectForm } from '../components/CreateProjectForm'
import { ProjectListItem } from '../components/ProjectListItem'
import { useProjectsStore } from '../stores/projectsStore'

export function ProjectsPage() {
  const projects = useProjectsStore((s) => s.projects)
  const loading = useProjectsStore((s) => s.loading)
  const error = useProjectsStore((s) => s.error)
  const load = useProjectsStore((s) => s.load)
  const create = useProjectsStore((s) => s.create)
  const rename = useProjectsStore((s) => s.rename)
  const remove = useProjectsStore((s) => s.remove)

  useEffect(() => {
    void load()
  }, [load])

  return (
    <>
      <h1>Projekti</h1>
      <CreateProjectForm onCreate={create} />
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {loading && projects.length === 0 ? (
        <p>Nalaganje …</p>
      ) : projects.length === 0 ? (
        <p className="muted">Ni še nobenega projekta.</p>
      ) : (
        <ul className="project-list">
          {projects.map((project) => (
            <ProjectListItem
              key={project.id}
              project={project}
              onRename={rename}
              onDelete={remove}
            />
          ))}
        </ul>
      )}
    </>
  )
}

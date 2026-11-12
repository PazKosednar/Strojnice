import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <main className="page">
      <h1>Stran ne obstaja</h1>
      <p>
        <Link to="/projekti">Na seznam projektov</Link>
      </p>
    </main>
  )
}

import { Outlet } from 'react-router'
import { AppHeader } from './AppHeader'

/** Layout for signed-in pages: header with sign-out + page content. */
export function AppLayout() {
  return (
    <>
      <AppHeader />
      <main className="page">
        <Outlet />
      </main>
    </>
  )
}

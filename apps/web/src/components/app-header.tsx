import { Link } from '@tanstack/react-router'
import { Box, LogOut, Settings } from 'lucide-react'
import { authClient } from '#/lib/auth-client'

export function AppHeader() {
  const session = authClient.useSession()
  return (
    <header className="app-header">
      <Link to="/artifacts" className="brand">
        <span className="brand-mark">
          <Box size={16} />
        </span>
        <span>Otterware</span>
      </Link>
      <nav className="app-nav">
        <Link to="/artifacts" activeProps={{ className: 'active' }}>
          Artifacts
        </Link>
        <Link to="/settings" activeProps={{ className: 'active' }}>
          <Settings size={15} /> Settings
        </Link>
      </nav>
      <div className="account-menu">
        <span className="avatar">
          {session.data?.user.name?.slice(0, 2).toUpperCase() ?? 'OT'}
        </span>
        <span className="account-name">{session.data?.user.name}</span>
        <button
          className="icon-button"
          type="button"
          title="Sign out"
          onClick={() =>
            authClient.signOut({
              fetchOptions: { onSuccess: () => location.assign('/login') },
            })
          }
        >
          <LogOut size={15} />
        </button>
      </div>
    </header>
  )
}

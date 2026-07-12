import { Link } from '@tanstack/react-router'
import {
  Box,
  Check,
  ChevronDown,
  ChevronsUpDown,
  FileBox,
  LogOut,
  Search,
  Settings,
  Users,
} from 'lucide-react'
import { authClient } from '#/lib/auth-client'
import { useOrganizations } from '@/hooks/use-organizations'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ThemeMenu } from '@/components/theme-menu'

export function AppHeader() {
  const session = authClient.useSession()
  const { activeOrganization, organizations, selectOrganization } =
    useOrganizations()
  const pageTitle = globalThis.location?.pathname.startsWith('/settings')
    ? 'Settings'
    : 'Artifacts'

  return (
    <>
      <aside className="app-sidebar">
        <div className="sidebar-workspace">
          <Link
            to="/artifacts"
            className="sidebar-brand"
            aria-label="Otterware home"
          >
            <span className="brand-mark">
              <Box />
            </span>
            <span>Otterware</span>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" className="sidebar-team-trigger" />
              }
            >
              <span className="team-avatar">
                {(activeOrganization?.name ?? 'T').slice(0, 1).toUpperCase()}
              </span>
              <span className="sidebar-team-name">
                {activeOrganization?.name ?? 'Select team'}
              </span>
              <ChevronsUpDown />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="team-switcher-menu">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Teams</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {organizations.map((organization) => (
                  <DropdownMenuItem
                    key={organization.id}
                    onClick={() => void selectOrganization(organization.id)}
                  >
                    <Users />
                    <span>{organization.name}</span>
                    {organization.id === activeOrganization?.id && (
                      <Check className="menu-item-check" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <button
          className="sidebar-search"
          type="button"
          onClick={() => {
            const input = document.querySelector<HTMLInputElement>(
              '.artifact-search-field input',
            )
            input?.focus()
          }}
        >
          <Search />
          <span>Find</span>
          <kbd>F</kbd>
        </button>

        <nav className="sidebar-nav" aria-label="Workspace navigation">
          <Link to="/artifacts" activeProps={{ className: 'active' }}>
            <FileBox /> Artifacts
          </Link>
          <Link to="/settings" activeProps={{ className: 'active' }}>
            <Settings /> Settings
          </Link>
        </nav>

        <div className="sidebar-account">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" className="sidebar-user-trigger" />
              }
            >
              <span className="avatar">
                {session.data?.user.name?.slice(0, 2).toUpperCase() ?? 'OT'}
              </span>
              <span className="sidebar-user-copy">
                <strong>{session.data?.user.name}</strong>
                <small>Account</small>
              </span>
              <ChevronDown />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className="user-menu">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="user-menu-identity">
                  <strong>{session.data?.user.name}</strong>
                  <small>{session.data?.user.email}</small>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem render={<Link to="/settings" />}>
                <Settings /> Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <ThemeMenu />
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() =>
                  authClient.signOut({
                    fetchOptions: {
                      onSuccess: () => location.assign('/login'),
                    },
                  })
                }
              >
                <LogOut /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <header className="app-header">
        <div className="header-context">
          <span>{activeOrganization?.name ?? 'Workspace'}</span>
          <ChevronsUpDown />
        </div>
        <strong>{pageTitle}</strong>
        <div className="mobile-account-menu">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Open account menu"
                />
              }
            >
              <span className="avatar">
                {session.data?.user.name?.slice(0, 2).toUpperCase() ?? 'OT'}
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="user-menu">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="user-menu-identity">
                  <strong>{session.data?.user.name}</strong>
                  <small>{session.data?.user.email}</small>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem render={<Link to="/artifacts" />}>
                <FileBox /> Artifacts
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link to="/settings" />}>
                <Settings /> Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <ThemeMenu />
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() =>
                  authClient.signOut({
                    fetchOptions: {
                      onSuccess: () => location.assign('/login'),
                    },
                  })
                }
              >
                <LogOut /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </>
  )
}

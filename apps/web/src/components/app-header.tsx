import { Link, useLocation } from '@tanstack/react-router'
import {
  Box,
  Check,
  ChevronRight,
  ChevronsUpDown,
  FileBox,
  LogOut,
  Search,
  Settings,
  Users,
} from 'lucide-react'
import { authClient } from '#/lib/auth-client'
import { useHydrated } from '#/lib/session-cache'
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
import { openCommandPalette } from '@/components/command-palette'

function signOut() {
  void authClient.signOut({
    fetchOptions: { onSuccess: () => location.assign('/login') },
  })
}

export function AppHeader({ actions }: { actions?: React.ReactNode }) {
  const session = authClient.useSession()
  const { activeOrganization, organizations, selectOrganization } =
    useOrganizations()
  // Teams come from sessionStorage before the network answers, which the
  // server cannot see; hold them back until hydration is done.
  const hydrated = useHydrated()
  const user = hydrated ? session.data?.user : undefined
  const teamName = hydrated ? activeOrganization?.name : undefined
  const pathname = useLocation({ select: (location) => location.pathname })
  const pageTitle = pathname.startsWith('/settings') ? 'Settings' : 'Artifacts'
  const initials = user?.name?.slice(0, 2).toUpperCase() ?? 'OT'

  const accountMenu = (
    <>
      <DropdownMenuGroup>
        <DropdownMenuLabel className="user-menu-identity">
          <strong>{user?.name}</strong>
          <small>{user?.email}</small>
        </DropdownMenuLabel>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuItem render={<Link to="/artifacts" />}>
          <FileBox /> Artifacts
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link to="/settings" />}>
          <Settings /> Settings
        </DropdownMenuItem>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <ThemeMenu />
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuItem onClick={signOut}>
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuGroup>
    </>
  )

  return (
    <>
      <aside className="app-sidebar">
        <div className="sidebar-brand">
          <span className="brand-mark">
            <Box />
          </span>
          <strong>Otterware</strong>
        </div>

        <button
          className="sidebar-search"
          type="button"
          onClick={openCommandPalette}
        >
          <Search />
          <span>Search</span>
          <kbd>⌘K</kbd>
        </button>

        <nav className="sidebar-nav sidebar-teams" aria-label="Teams">
          <span className="nav-label">Teams</span>
          {(hydrated ? organizations : []).map((organization) => {
            const active = organization.id === activeOrganization?.id
            return (
              <button
                key={organization.id}
                type="button"
                className={active ? 'active' : undefined}
                aria-current={active ? 'true' : undefined}
                onClick={() => void selectOrganization(organization.id)}
              >
                <Users />
                <span>{organization.name}</span>
                {active && <Check className="sidebar-check" />}
              </button>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className="sidebar-account"
                  aria-label="Open account menu"
                />
              }
            >
              <span className="avatar">{initials}</span>
              <span className="sidebar-account-copy">
                <strong>{user?.name}</strong>
                <small>{user?.email}</small>
              </span>
              <ChevronsUpDown className="sidebar-account-chevron" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className="user-menu">
              {accountMenu}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <header className="app-header">
        <nav className="app-breadcrumb" aria-label="Breadcrumb">
          <span>
            <Users />
            {teamName ?? 'Team'}
          </span>
          <ChevronRight />
          <strong>{pageTitle}</strong>
        </nav>
        {actions && <div className="app-header-actions">{actions}</div>}
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
              <span className="avatar">{initials}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="user-menu">
              {accountMenu}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </>
  )
}

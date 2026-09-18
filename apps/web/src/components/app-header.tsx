import { Link, useLocation } from '@tanstack/react-router'
import {
  Box,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Clock,
  FileBox,
  Layers,
  LogOut,
  Plus,
  Search,
  Settings,
  User,
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
      <aside className="app-sidebar finder-sidebar">
        <div className="finder-traffic-lights" aria-hidden="true">
          <span className="traffic-dot traffic-red" />
          <span className="traffic-dot traffic-yellow" />
          <span className="traffic-dot traffic-green" />
        </div>

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

        <nav className="sidebar-nav sidebar-favorites" aria-label="Favorites">
          <span className="nav-label">Favorites</span>
          <Link to="/artifacts" className="finder-sidebar-link active">
            <Clock size={15} />
            <span>Recents</span>
          </Link>
          <Link to="/artifacts" className="finder-sidebar-link">
            <Users size={15} />
            <span>Shared</span>
          </Link>
        </nav>

        <nav
          className="sidebar-nav sidebar-spaces sidebar-teams"
          aria-label="Spaces"
        >
          <div className="sidebar-section-header">
            <span className="nav-label">Spaces</span>
            <Link
              to="/settings"
              hash="space"
              className="sidebar-add-space"
              aria-label="Create space"
            >
              <Plus size={13} />
            </Link>
          </div>
          {(hydrated ? organizations : []).map((organization) => {
            const active = organization.id === activeOrganization?.id
            const isPersonal =
              Boolean(user?.name) &&
              organization.name.trim().toLowerCase() ===
                user!.name.trim().toLowerCase()
            return (
              <button
                key={organization.id}
                type="button"
                className={active ? 'active' : undefined}
                aria-current={active ? 'true' : undefined}
                onClick={() => void selectOrganization(organization.id)}
              >
                {isPersonal ? <User size={15} /> : <Layers size={15} />}
                <span className="truncate">{organization.name}</span>
                {isPersonal && (
                  <span className="space-type-badge">Personal</span>
                )}
                {active && <Check className="sidebar-check" />}
              </button>
            )
          })}
        </nav>

        <nav className="sidebar-nav sidebar-tags-nav" aria-label="Tags">
          <span className="nav-label">Tags</span>
          <div className="finder-tags-pill-row">
            <span className="tag-circle tag-red" title="Red" />
            <span className="tag-circle tag-orange" title="Orange" />
            <span className="tag-circle tag-yellow" title="Yellow" />
            <span className="tag-circle tag-green" title="Green" />
            <span className="tag-circle tag-blue" title="Blue" />
            <span className="tag-circle tag-purple" title="Purple" />
          </div>
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

      <header className="app-header finder-titlebar">
        <div className="finder-titlebar-left">
          <div className="finder-nav-arrows">
            <Button
              variant="ghost"
              size="icon-xs"
              className="finder-arrow-btn"
              disabled
              aria-label="Back"
            >
              <ChevronLeft size={14} />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              className="finder-arrow-btn"
              disabled
              aria-label="Forward"
            >
              <ChevronRight size={14} />
            </Button>
          </div>
          <nav className="app-breadcrumb" aria-label="Breadcrumb">
            <span>
              <Layers size={14} />
              {teamName ?? 'Space'}
            </span>
            <ChevronRight size={13} />
            <strong>{pageTitle}</strong>
          </nav>
        </div>
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

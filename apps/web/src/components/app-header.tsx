import { useCallback, useEffect } from 'react'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import {
  Box,
  Check,
  ChevronRight,
  FileBox,
  Laptop,
  LogOut,
  Moon,
  Search,
  Settings,
  Sun,
  Users,
} from 'lucide-react'
import { useTheme } from 'next-themes'
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

const themes = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Laptop },
] as const

export function AppHeader({ actions }: { actions?: React.ReactNode }) {
  const session = authClient.useSession()
  const { activeOrganization, organizations, selectOrganization } =
    useOrganizations()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()
  const pathname = useLocation({ select: (location) => location.pathname })
  const pageTitle = pathname.startsWith('/settings') ? 'Settings' : 'Artifacts'

  const focusSearch = useCallback(() => {
    const input = document.querySelector<HTMLInputElement>(
      '.artifact-search-field input',
    )
    if (input) input.focus()
    else void navigate({ to: '/artifacts' })
  }, [navigate])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      )
        return
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]'))
        return
      if (event.key === 'f' || event.key === '/') {
        event.preventDefault()
        focusSearch()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [focusSearch])

  return (
    <>
      <aside className="app-sidebar">
        <div className="sidebar-brand">
          <span className="brand-mark">
            <Box />
          </span>
          <strong>Otterware</strong>
        </div>

        <nav className="sidebar-nav sidebar-teams" aria-label="Teams">
          <span className="nav-label">Teams</span>
          {organizations.map((organization) => {
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

        <button className="sidebar-search" type="button" onClick={focusSearch}>
          <Search />
          <span>Find</span>
          <kbd>F</kbd>
        </button>

        <nav className="sidebar-nav" aria-label="Workspace navigation">
          <Link to="/artifacts" activeProps={{ className: 'active' }}>
            <FileBox /> Artifacts
          </Link>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-theme" role="group" aria-label="Theme">
            {themes.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                aria-label={`${label} theme`}
                aria-pressed={(theme ?? 'system') === value}
                onClick={() => setTheme(value)}
              >
                <Icon />
              </button>
            ))}
          </div>
          <nav className="sidebar-nav" aria-label="Account">
            <Link to="/settings" activeProps={{ className: 'active' }}>
              <Settings /> Settings
            </Link>
          </nav>
          <div className="sidebar-account">
            <span className="avatar">
              {session.data?.user.name?.slice(0, 2).toUpperCase() ?? 'OT'}
            </span>
            <span className="sidebar-account-copy">
              <strong>{session.data?.user.name}</strong>
              <small>{session.data?.user.email}</small>
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              type="button"
              aria-label="Sign out"
              onClick={() =>
                authClient.signOut({
                  fetchOptions: {
                    onSuccess: () => location.assign('/login'),
                  },
                })
              }
            >
              <LogOut />
            </Button>
          </div>
        </div>
      </aside>

      <header className="app-header">
        <nav className="app-breadcrumb" aria-label="Breadcrumb">
          <span>
            <Users />
            {activeOrganization?.name ?? 'Team'}
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

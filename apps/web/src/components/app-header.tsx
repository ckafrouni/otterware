import { Link, useLocation } from '@tanstack/react-router'
import {
  Box,
  Check,
  ChevronsUpDown,
  FileBox,
  Layers,
  LogOut,
  Plus,
  Search,
  Settings,
  User,
} from 'lucide-react'
import { authClient } from '#/lib/auth-client'
import { useHydrated } from '#/lib/session-cache'
import { useOrganizations } from '@/hooks/use-organizations'
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
  const hydrated = useHydrated()
  const user = hydrated ? session.data?.user : undefined
  const spaceName = hydrated ? activeOrganization?.name : undefined
  const pathname = useLocation({ select: (location) => location.pathname })
  const pageTitle = pathname.startsWith('/settings') ? 'Settings' : 'Artifacts'
  const initials = user?.name?.slice(0, 2).toUpperCase() ?? 'OT'

  const isPersonal =
    Boolean(user?.name) &&
    activeOrganization?.name?.trim().toLowerCase() ===
      user!.name?.trim().toLowerCase()

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
          <FileBox size={14} /> Artifacts
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link to="/settings" />}>
          <Settings size={14} /> Space Settings
        </DropdownMenuItem>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <ThemeMenu />
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuItem onClick={signOut}>
          <LogOut size={14} /> Sign out
        </DropdownMenuItem>
      </DropdownMenuGroup>
    </>
  )

  return (
    <header className="app-header minimal-top-bar">
      {/* Left: Brand & Space Switcher */}
      <div className="header-brand-space">
        <Link to="/artifacts" className="brand-badge" aria-label="Otterware">
          <Box size={16} className="brand-badge-icon" />
          <strong className="brand-badge-title">Otterware</strong>
        </Link>

        <span className="header-slash" aria-hidden="true">
          /
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="space-selector-pill"
                aria-label="Switch space"
              />
            }
          >
            {isPersonal ? (
              <User size={13} className="text-muted-foreground" />
            ) : (
              <Layers size={13} className="text-primary" />
            )}
            <span className="space-selector-name truncate max-w-[150px]">
              {spaceName ?? 'Personal Space'}
            </span>
            <ChevronsUpDown size={12} className="opacity-40" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="space-selector-dropdown w-56"
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Spaces
              </DropdownMenuLabel>
              {(hydrated ? organizations : []).map((org) => {
                const active = org.id === activeOrganization?.id
                const orgPersonal =
                  Boolean(user?.name) &&
                  org.name.trim().toLowerCase() ===
                    user!.name.trim().toLowerCase()
                return (
                  <DropdownMenuItem
                    key={org.id}
                    onClick={() => void selectOrganization(org.id)}
                    className="flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      {orgPersonal ? <User size={13} /> : <Layers size={13} />}
                      <span className="truncate">{org.name}</span>
                    </div>
                    {active && <Check size={13} className="text-primary" />}
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link to="/settings" hash="space" />}>
              <Plus size={13} />
              <span>Create space</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <span className="header-slash" aria-hidden="true">
          /
        </span>

        <nav className="app-breadcrumb" aria-label="Breadcrumb">
          <strong>{pageTitle}</strong>
        </nav>
      </div>

      {/* Center: Command Palette Trigger */}
      <button
        type="button"
        className="header-command-trigger"
        onClick={openCommandPalette}
        aria-label="Search artifacts (Cmd+K)"
      >
        <Search size={13} className="text-muted-foreground" />
        <span className="header-command-placeholder">Search artifacts...</span>
        <kbd className="header-command-kbd">⌘K</kbd>
      </button>

      {/* Right: Actions Slot & Profile Avatar */}
      <div className="header-actions-profile">
        {actions && <div className="app-header-actions">{actions}</div>}

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="user-avatar-btn"
                aria-label="Account menu"
              />
            }
          >
            <span className="user-avatar-circle">{initials}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="user-menu w-56">
            {accountMenu}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

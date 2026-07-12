import { Link } from '@tanstack/react-router'
import {
  Box,
  Check,
  ChevronDown,
  ChevronsUpDown,
  LogOut,
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
  return (
    <header className="app-header">
      <div className="workspace-navigation">
        <Link to="/artifacts" className="brand" aria-label="Otterware home">
          <span className="brand-mark">
            <Box size={16} />
          </span>
          <span>Otterware</span>
        </Link>
        <span className="workspace-divider" />
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="sm"
                className="team-switcher-trigger"
              />
            }
          >
            <span className="team-avatar">
              {(activeOrganization?.name ?? 'T').slice(0, 1).toUpperCase()}
            </span>
            <span>{activeOrganization?.name ?? 'Select team'}</span>
            <ChevronsUpDown size={13} />
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
                  <Users size={14} />
                  <span>{organization.name}</span>
                  {organization.id === activeOrganization?.id && (
                    <Check className="team-check" size={14} />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <span className="workspace-divider" />
        <nav className="workspace-links">
          <Link to="/artifacts" activeProps={{ className: 'active' }}>
            Artifacts
          </Link>
        </nav>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="sm" className="user-menu-trigger" />
          }
        >
          <span className="avatar">
            {session.data?.user.name?.slice(0, 2).toUpperCase() ?? 'OT'}
          </span>
          <span className="account-name">{session.data?.user.name}</span>
          <ChevronDown size={13} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="user-menu">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="user-menu-identity">
              <strong>{session.data?.user.name}</strong>
              <small>{session.data?.user.email}</small>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem render={<Link to="/settings" />}>
            <Settings size={14} /> Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <ThemeMenu />
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() =>
              authClient.signOut({
                fetchOptions: { onSuccess: () => location.assign('/login') },
              })
            }
          >
            <LogOut size={14} /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}

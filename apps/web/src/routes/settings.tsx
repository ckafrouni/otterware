import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Building2, Copy, KeyRound, Pencil, Plus, UserPlus } from 'lucide-react'
import { authClient } from '#/lib/auth-client'
import { AppHeader } from '#/components/app-header'
import { AuthGate } from '#/components/auth-gate'
import { useCurrentActor } from '@/hooks/use-current-actor'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Organization {
  id: string
  name: string
  slug: string
}

export const Route = createFileRoute('/settings')({ component: SettingsPage })

function SettingsPage() {
  const session = authClient.useSession()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [orgName, setOrgName] = useState('')
  const [teamName, setTeamName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('viewer')
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [keyName, setKeyName] = useState('Agent')
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const { roles } = useCurrentActor()

  const activeOrganizationId =
    session.data?.session.activeOrganizationId ?? organizations[0]?.id
  const activeOrganization = organizations.find(
    (organization) => organization.id === activeOrganizationId,
  )
  const canManageOrganization = roles.some((role) =>
    ['owner', 'admin'].includes(role),
  )

  async function refreshOrganizations() {
    const result = await authClient.organization.list()
    setOrganizations((result.data ?? []) as Organization[])
  }

  useEffect(() => {
    void refreshOrganizations()
  }, [])

  useEffect(() => {
    setTeamName(activeOrganization?.name ?? '')
  }, [activeOrganization?.id, activeOrganization?.name])

  async function createOrganization(event: React.FormEvent) {
    event.preventDefault()
    const slug = orgName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    const result = await authClient.organization.create({ name: orgName, slug })
    if (result.error)
      setMessage(result.error.message ?? 'Could not create organization.')
    else {
      setOrgName('')
      setMessage('Organization created.')
      await refreshOrganizations()
    }
  }

  async function selectOrganization(organizationId: string) {
    await authClient.organization.setActive({ organizationId })
    await session.refetch()
    setMessage('Active organization changed.')
  }

  async function renameOrganization(event: React.FormEvent) {
    event.preventDefault()
    const name = teamName.trim()
    if (!activeOrganizationId || !name || !canManageOrganization) return
    const result = await authClient.organization.update({
      organizationId: activeOrganizationId,
      data: { name },
    })
    if (result.error) {
      setMessage(result.error.message ?? 'Could not rename the team.')
      return
    }
    setMessage('Team renamed.')
    await refreshOrganizations()
    window.dispatchEvent(new Event('otterware:organizations-changed'))
  }

  async function invite(event: React.FormEvent) {
    event.preventDefault()
    if (!activeOrganizationId) return
    const result = await authClient.organization.inviteMember({
      email: inviteEmail,
      role: inviteRole as 'owner' | 'admin' | 'editor' | 'viewer',
      organizationId: activeOrganizationId,
    })
    if (result.error)
      setMessage(result.error.message ?? 'Could not create invitation.')
    else if (result.data) {
      setInviteLink(`${location.origin}/invite/${result.data.id}`)
      setInviteEmail('')
    }
  }

  async function createKey(event: React.FormEvent) {
    event.preventDefault()
    if (!activeOrganizationId) return
    const result = await authClient.apiKey.create({
      configId: 'organization',
      organizationId: activeOrganizationId,
      name: keyName,
      prefix: 'otw_',
    })
    if (result.error)
      setMessage(result.error.message ?? 'Could not create API key.')
    else if (result.data) setCreatedKey(result.data.key)
  }

  return (
    <AuthGate>
      <div className="app-shell">
        <AppHeader />
        <main className="settings-page">
          <section className="settings-heading">
            <h1>Settings</h1>
            <p>Workspace preferences and access.</p>
          </section>
          <div className="settings-layout">
            <nav className="settings-nav" aria-label="Settings sections">
              <a href="#team">
                <Building2 size={15} /> Team
              </a>
              <a href="#collaborators">
                <UserPlus size={15} /> Collaborators
              </a>
              <a href="#agent-access">
                <KeyRound size={15} /> Agent access
              </a>
            </nav>

            <div className="settings-content">
              {message && <div className="notice">{message}</div>}

              <Card id="team" className="settings-panel">
                <div className="settings-panel-heading">
                  <div>
                    <h2>Team</h2>
                    <p>Choose and configure your active workspace.</p>
                  </div>
                </div>
                <div className="settings-panel-body">
                  <div className="settings-field">
                    <label htmlFor="active-team">Active team</label>
                    <Select
                      value={activeOrganizationId}
                      onValueChange={(value) =>
                        value && void selectOrganization(value)
                      }
                    >
                      <SelectTrigger id="active-team" className="w-full">
                        <SelectValue placeholder="Select a team" />
                      </SelectTrigger>
                      <SelectContent>
                        {organizations.map((organization) => (
                          <SelectItem
                            key={organization.id}
                            value={organization.id}
                          >
                            {organization.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {canManageOrganization && activeOrganization && (
                    <form
                      className="settings-field"
                      onSubmit={renameOrganization}
                    >
                      <label htmlFor="team-name">Team name</label>
                      <div className="settings-control-row">
                        <Input
                          id="team-name"
                          required
                          maxLength={80}
                          value={teamName}
                          onChange={(event) => setTeamName(event.target.value)}
                        />
                        <Button
                          variant="outline"
                          type="submit"
                          disabled={
                            !teamName.trim() ||
                            teamName.trim() === activeOrganization.name
                          }
                        >
                          <Pencil size={14} /> Save
                        </Button>
                      </div>
                    </form>
                  )}

                  <form
                    className="settings-field settings-field-separated"
                    onSubmit={createOrganization}
                  >
                    <label htmlFor="new-organization">
                      Create another team
                    </label>
                    <div className="settings-control-row">
                      <Input
                        id="new-organization"
                        required
                        placeholder="Team name"
                        value={orgName}
                        onChange={(event) => setOrgName(event.target.value)}
                      />
                      <Button variant="outline" type="submit">
                        <Plus size={14} /> Create
                      </Button>
                    </div>
                  </form>
                </div>
              </Card>

              <Card id="collaborators" className="settings-panel">
                <div className="settings-panel-heading">
                  <div>
                    <h2>Collaborators</h2>
                    <p>Invite someone to the active team.</p>
                  </div>
                </div>
                <div className="settings-panel-body">
                  <form className="invite-form" onSubmit={invite}>
                    <div className="settings-field">
                      <label htmlFor="invite-email">Email address</label>
                      <Input
                        id="invite-email"
                        required
                        type="email"
                        placeholder="colleague@example.com"
                        value={inviteEmail}
                        onChange={(event) => setInviteEmail(event.target.value)}
                      />
                    </div>
                    <div className="settings-field invite-role-field">
                      <label htmlFor="invite-role">Role</label>
                      <Select
                        value={inviteRole}
                        onValueChange={(value) =>
                          setInviteRole(value ?? 'viewer')
                        }
                      >
                        <SelectTrigger id="invite-role" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">Viewer</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      variant="outline"
                      type="submit"
                      disabled={!activeOrganizationId}
                    >
                      Send invite
                    </Button>
                  </form>
                  {inviteLink && (
                    <div className="secret-output">
                      <code>{inviteLink}</code>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        type="button"
                        onClick={() =>
                          void navigator.clipboard.writeText(inviteLink)
                        }
                      >
                        <Copy size={14} />
                      </Button>
                    </div>
                  )}
                </div>
              </Card>

              <Card id="agent-access" className="settings-panel">
                <div className="settings-panel-heading">
                  <div>
                    <h2>Agent access</h2>
                    <p>Create organization-scoped credentials for agents.</p>
                  </div>
                </div>
                <div className="settings-panel-body">
                  <form className="settings-field" onSubmit={createKey}>
                    <label htmlFor="key-name">Key name</label>
                    <div className="settings-control-row">
                      <Input
                        id="key-name"
                        required
                        value={keyName}
                        onChange={(event) => setKeyName(event.target.value)}
                      />
                      <Button
                        variant="outline"
                        type="submit"
                        disabled={!activeOrganizationId}
                      >
                        Create key
                      </Button>
                    </div>
                    <p className="settings-help">
                      Keys can access shared organization artifacts, never
                      private artifacts.
                    </p>
                  </form>
                  {createdKey && (
                    <div>
                      <p className="security-note">
                        Copy this key now. It will not be shown again.
                      </p>
                      <div className="secret-output">
                        <code>{createdKey}</code>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          type="button"
                          onClick={() =>
                            void navigator.clipboard.writeText(createdKey)
                          }
                        >
                          <Copy size={14} />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </AuthGate>
  )
}

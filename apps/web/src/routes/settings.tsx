import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Check, Copy, KeyRound, Pencil, Plus, Users } from 'lucide-react'
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
          <section className="page-heading">
            <div>
              <p className="eyebrow">Workspace</p>
              <h1>Settings</h1>
              <p>Organizations, collaborators, and agent credentials.</p>
            </div>
          </section>
          {message && <div className="notice">{message}</div>}
          <div className="settings-grid">
            <Card className="settings-card">
              <div className="settings-card-heading">
                <Users size={17} />
                <div>
                  <h2>Organizations</h2>
                  <p>Artifacts are isolated by organization.</p>
                </div>
              </div>
              <div className="organization-list">
                {organizations.map((organization) => (
                  <Button
                    key={organization.id}
                    variant="ghost"
                    type="button"
                    className={
                      organization.id === activeOrganizationId
                        ? 'organization active'
                        : 'organization'
                    }
                    onClick={() => void selectOrganization(organization.id)}
                  >
                    <span>{organization.name}</span>
                    {organization.id === activeOrganizationId && (
                      <Check size={14} />
                    )}
                  </Button>
                ))}
              </div>
              {canManageOrganization && activeOrganization && (
                <div className="settings-subsection">
                  <label htmlFor="team-name">Team name</label>
                  <form className="inline-form" onSubmit={renameOrganization}>
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
                      <Pencil size={14} /> Rename
                    </Button>
                  </form>
                </div>
              )}
              <div className="settings-subsection">
                <label htmlFor="new-organization">New team</label>
                <form className="inline-form" onSubmit={createOrganization}>
                  <Input
                    id="new-organization"
                    required
                    placeholder="New organization"
                    value={orgName}
                    onChange={(event) => setOrgName(event.target.value)}
                  />
                  <Button variant="outline" type="submit">
                    <Plus size={14} /> Create
                  </Button>
                </form>
              </div>
            </Card>

            <Card className="settings-card">
              <div className="settings-card-heading">
                <Users size={17} />
                <div>
                  <h2>Invite collaborator</h2>
                  <p>Create a private invitation link.</p>
                </div>
              </div>
              <form className="stacked-form" onSubmit={invite}>
                <Input
                  required
                  type="email"
                  placeholder="colleague@example.com"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                />
                <Select
                  value={inviteRole}
                  onValueChange={(value) => setInviteRole(value ?? 'viewer')}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  type="submit"
                  disabled={!activeOrganizationId}
                >
                  Create invitation
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
            </Card>

            <Card className="settings-card wide-card">
              <div className="settings-card-heading">
                <KeyRound size={17} />
                <div>
                  <h2>Agent API key</h2>
                  <p>
                    Organization-scoped keys can access shared artifacts, never
                    private artifacts.
                  </p>
                </div>
              </div>
              <form className="inline-form" onSubmit={createKey}>
                <Input
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
            </Card>
          </div>
        </main>
      </div>
    </AuthGate>
  )
}

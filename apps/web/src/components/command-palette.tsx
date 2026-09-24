import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQueries } from '@tanstack/react-query'
import { Command } from 'cmdk'
import { FileBox, Search, Settings, Upload, Users } from 'lucide-react'
import { artifactListResponseSchema, type Artifact } from '@otterware/contracts'
import { api } from '#/lib/api'
import { authClient } from '#/lib/auth-client'
import { useOrganizations } from '@/hooks/use-organizations'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

export const COMMAND_PALETTE_EVENT = 'otterdrive:command-palette'
export const UPLOAD_ARTIFACT_EVENT = 'otterdrive:upload-artifact'

export function openCommandPalette() {
  window.dispatchEvent(new Event(COMMAND_PALETTE_EVENT))
}

/** Focus the search field of the current view when it has one; otherwise
 *  open the palette. */
export function findInView() {
  const input = document.querySelector<HTMLInputElement>(
    '.artifact-search-field input',
  )
  if (input) {
    input.focus()
    input.select()
  } else {
    openCommandPalette()
  }
}

export function CommandPalette() {
  const session = authClient.useSession()
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const navigate = useNavigate()
  const { activeOrganization, organizations, selectOrganization } =
    useOrganizations()
  const signedIn = Boolean(session.data?.user)

  useEffect(() => {
    if (!signedIn) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented) return
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen((current) => !current)
        return
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]'))
        return
      if (event.key === 'f' || event.key === '/') {
        event.preventDefault()
        findInView()
      }
    }
    const onOpen = () => setOpen(true)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener(COMMAND_PALETTE_EVENT, onOpen)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener(COMMAND_PALETTE_EVENT, onOpen)
    }
  }, [signedIn])

  useEffect(() => {
    if (!open) setValue('')
  }, [open])

  const artifactQueries = useQueries({
    queries: organizations.map((organization) => ({
      enabled: open,
      queryKey: ['artifacts', organization.id, 'active'] as const,
      queryFn: async () => {
        const result = await api<unknown>('/api/v1/artifacts?limit=100', {
          organizationId: organization.id,
        })
        return artifactListResponseSchema.parse(result).data
      },
      staleTime: 60_000,
    })),
  })

  const groups = organizations.map((organization, index) => ({
    organization,
    artifacts: (artifactQueries[index]?.data ?? []).filter(
      (artifact) => !artifact.archivedAt,
    ),
  }))
  const loading = open && artifactQueries.some((query) => query.isPending)

  const openArtifact = useCallback(
    (organizationSlug: string, organizationId: string, artifact: Artifact) => {
      setOpen(false)
      if (organizationId !== activeOrganization?.id) {
        void selectOrganization(organizationId).catch(() => undefined)
      }
      void navigate({
        to: '/$organizationSlug/a/$slug',
        params: { organizationSlug, slug: artifact.slug },
      })
    },
    [activeOrganization?.id, navigate, selectOrganization],
  )

  if (!signedIn) return null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="command-palette">
        <DialogTitle className="sr-only">Search</DialogTitle>
        <Command
          label="Search documents and commands"
          loop
          filter={(value, search) =>
            value.toLowerCase().includes(search.trim().toLowerCase()) ? 1 : 0
          }
        >
          <div className="command-input">
            <Search size={15} />
            <Command.Input
              autoFocus
              value={value}
              onValueChange={setValue}
              placeholder="Search documents across teams…"
            />
            <kbd>esc</kbd>
          </div>
          <Command.List>
            <Command.Empty>
              {loading ? 'Loading…' : 'No results.'}
            </Command.Empty>
            {groups.map(({ organization, artifacts }) =>
              artifacts.length === 0 ? null : (
                <Command.Group
                  key={organization.id}
                  heading={organization.name}
                >
                  {artifacts.map((artifact) => (
                    <Command.Item
                      key={artifact.id}
                      value={`${artifact.title} ${artifact.slug} ${organization.name}`}
                      keywords={[artifact.description]}
                      onSelect={() =>
                        openArtifact(
                          organization.slug,
                          organization.id,
                          artifact,
                        )
                      }
                    >
                      <FileBox />
                      <span className="command-item-title">
                        {artifact.title}
                      </span>
                      <small>v{artifact.currentVersion?.number ?? 1}</small>
                    </Command.Item>
                  ))}
                </Command.Group>
              ),
            )}
            <Command.Group heading="Commands">
              <Command.Item
                value="upload document new"
                onSelect={() => {
                  setOpen(false)
                  void navigate({ to: '/home' }).then(() =>
                    window.dispatchEvent(new Event(UPLOAD_ARTIFACT_EVENT)),
                  )
                }}
              >
                <Upload />
                <span className="command-item-title">Upload document</span>
              </Command.Item>
              {organizations
                .filter(
                  (organization) => organization.id !== activeOrganization?.id,
                )
                .map((organization) => (
                  <Command.Item
                    key={organization.id}
                    value={`switch team ${organization.name}`}
                    onSelect={() => {
                      setOpen(false)
                      void selectOrganization(organization.id).then(() =>
                        navigate({ to: '/home' }),
                      )
                    }}
                  >
                    <Users />
                    <span className="command-item-title">
                      Switch to {organization.name}
                    </span>
                  </Command.Item>
                ))}
              <Command.Item
                value="settings"
                onSelect={() => {
                  setOpen(false)
                  void navigate({ to: '/settings' })
                }}
              >
                <Settings />
                <span className="command-item-title">Settings</span>
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  )
}

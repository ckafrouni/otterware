import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { toast } from 'sonner'
import {
  Archive,
  ChevronDown,
  Copy,
  Download,
  Home,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import {
  artifactResponseSchema,
  artifactVersionsResponseSchema,
  type Artifact,
  type ArtifactVersion,
} from '@otterware/contracts'
import { api, formatDate } from '#/lib/api'
import { useOrganizations } from '@/hooks/use-organizations'
import { useCurrentActor } from '@/hooks/use-current-actor'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ArtifactLoadingState } from './artifact-loading-state'
import { DeleteArtifactDialog } from './delete-artifact-dialog'

const ArtifactDocumentPreview = lazy(() =>
  import('./artifact-document-preview').then((module) => ({
    default: module.ArtifactDocumentPreview,
  })),
)

interface PreviewResponse {
  data: {
    url: string
    expiresAt: string
    version: ArtifactVersion
    contentType: string
  }
}

export function ArtifactViewer({
  onSheetChange,
  organizationId,
  organizationSlug,
  sheet,
  slug,
  version,
}: {
  onSheetChange?: ((sheet: string | undefined) => void) | undefined
  organizationId: string
  organizationSlug: string
  sheet?: string | undefined
  slug: string
  version?: number
}) {
  const [artifact, setArtifact] = useState<Artifact | null>(null)
  const [versions, setVersions] = useState<ArtifactVersion[]>([])
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewContentType, setPreviewContentType] = useState<string | null>(
    null,
  )
  const [error, setError] = useState<string | null>(null)
  const [changingArchivedState, setChangingArchivedState] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const { organizations } = useOrganizations()
  const { isOwner } = useCurrentActor()

  const selected = useMemo(
    () =>
      versions.find((item) => item.number === version) ??
      versions.find((item) => item.id === artifact?.currentVersion?.id) ??
      artifact?.currentVersion ??
      null,
    [artifact, version, versions],
  )
  const artifactOrganization = organizations.find(
    (organization) => organization.id === artifact?.organizationId,
  )

  useEffect(() => {
    setError(null)
    Promise.all([
      api<unknown>(`/api/v1/artifacts/${encodeURIComponent(slug)}`, {
        organizationId,
      }),
      api<unknown>(`/api/v1/artifacts/${encodeURIComponent(slug)}/versions`, {
        organizationId,
      }),
    ])
      .then(([artifactResult, versionsResult]) => {
        setArtifact(artifactResponseSchema.parse(artifactResult).data)
        setVersions(artifactVersionsResponseSchema.parse(versionsResult).data)
      })
      .catch((reason: Error) => setError(reason.message))
  }, [organizationId, slug])

  useEffect(() => {
    const controller = new AbortController()
    setPreviewUrl(null)
    setPreviewContentType(null)
    setError(null)
    const query = version ? `?version=${version}` : ''
    api<PreviewResponse>(
      `/api/v1/artifacts/${encodeURIComponent(slug)}/preview${query}`,
      { organizationId, signal: controller.signal },
    )
      .then((result) => {
        if (!controller.signal.aborted) {
          setPreviewUrl(result.data.url)
          setPreviewContentType(result.data.contentType)
        }
      })
      .catch((reason: Error) => {
        if (!controller.signal.aborted) setError(reason.message)
      })

    return () => controller.abort()
  }, [organizationId, slug, version])

  async function copy(value: string, message: string) {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(message)
    } catch {
      toast.error('Could not copy to the clipboard.')
    }
  }

  async function downloadArtifact() {
    if (!artifact || !selected) return
    try {
      const response = await fetch(
        `/api/v1/artifacts/${encodeURIComponent(artifact.id)}/download?version=${selected.number}`,
        { headers: { 'x-otterware-organization': organizationId } },
      )
      if (!response.ok) throw new Error(`Download failed (${response.status}).`)
      const disposition = response.headers.get('content-disposition')
      const filename =
        disposition?.match(/filename="?([^";]+)"?/i)?.[1] ?? selected.entryPath
      const url = URL.createObjectURL(await response.blob())
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.click()
      URL.revokeObjectURL(url)
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : String(reason))
    }
  }

  async function changeArchivedState() {
    if (!artifact) return
    setChangingArchivedState(true)
    setError(null)
    try {
      const result = artifactResponseSchema.parse(
        artifact.archivedAt
          ? await api<unknown>(
              `/api/v1/artifacts/${encodeURIComponent(artifact.id)}/restore`,
              { method: 'POST', organizationId },
            )
          : await api<unknown>(
              `/api/v1/artifacts/${encodeURIComponent(artifact.id)}`,
              { method: 'DELETE', organizationId },
            ),
      )
      setArtifact(result.data)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setChangingArchivedState(false)
    }
  }

  return (
    <div className="viewer-shell">
      <header className="viewer-header">
        <div className="viewer-left">
          <Button
            render={<Link to="/artifacts" />}
            variant="outline"
            size="icon-sm"
            aria-label="Back to artifacts"
          >
            <Home size={15} />
          </Button>
          {artifact && selected ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="version-trigger"
                  />
                }
              >
                <strong>{artifact.title}</strong>
                {versions.length > 1 && <ChevronDown size={15} />}
              </DropdownMenuTrigger>
              {versions.length > 1 && (
                <DropdownMenuContent align="start" className="version-menu">
                  {versions.map((item) => (
                    <DropdownMenuItem
                      key={item.id}
                      render={
                        <Link
                          to="/$organizationSlug/a/$slug/$version"
                          params={{
                            organizationSlug:
                              artifactOrganization?.slug ?? 'team',
                            slug: artifact.slug,
                            version: `v${item.number}`,
                          }}
                          search={sheet ? { sheet } : {}}
                        />
                      }
                      className={
                        item.number === selected.number ? 'active' : ''
                      }
                    >
                      <strong>v{item.number}</strong>
                      <span>{item.label}</span>
                      <small>{formatDate(item.createdAt)}</small>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              )}
            </DropdownMenu>
          ) : (
            <strong>Otterware Artifact</strong>
          )}
          {artifact && (
            <span className="viewer-byline">
              <strong>{artifactOrganization?.name ?? 'Team'}</strong>
              <span aria-hidden="true">·</span>
              {artifact.visibility === 'private' ? 'Private' : 'Shared'}
            </span>
          )}
          {selected && versions.length > 1 && (
            <Badge variant="outline">v{selected.number}</Badge>
          )}
          {artifact?.archivedAt && <Badge variant="secondary">Archived</Badge>}
        </div>
        <div className="viewer-actions">
          {artifact && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon-sm"
                    type="button"
                    aria-label="Artifact actions"
                    disabled={changingArchivedState}
                  />
                }
              >
                <MoreHorizontal size={15} />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="artifact-actions-menu"
              >
                <DropdownMenuItem
                  variant={artifact.archivedAt ? 'default' : 'destructive'}
                  onClick={() => void changeArchivedState()}
                >
                  {artifact.archivedAt ? (
                    <RotateCcw size={14} />
                  ) : (
                    <Archive size={14} />
                  )}
                  {artifact.archivedAt
                    ? 'Restore artifact'
                    : 'Archive artifact'}
                </DropdownMenuItem>
                {artifact.archivedAt && isOwner && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setDeleteDialogOpen(true)}
                    >
                      <Trash2 size={14} />
                      Delete permanently
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button
            variant="outline"
            size="icon-sm"
            type="button"
            aria-label="Copy edit prompt"
            onClick={() =>
              void copy(
                `Edit my Otterware artifact at ${artifact?.url}. Read the current version first and publish a new immutable version with the Otterware CLI.`,
                'Edit prompt copied.',
              )
            }
          >
            <Pencil size={15} />
          </Button>
          {artifact && selected && (
            <Button
              variant="outline"
              size="icon-sm"
              type="button"
              aria-label={`Download ${artifact.title} version ${selected.number}`}
              onClick={() => void downloadArtifact()}
            >
              <Download size={15} />
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() =>
              artifact && void copy(artifact.url, 'Artifact link copied.')
            }
          >
            <Copy size={14} /> Share
          </Button>
        </div>
      </header>
      <main className="viewer-main">
        {error && <div className="viewer-message error-panel">{error}</div>}
        {!error && !previewUrl && <ArtifactLoadingState />}
        {previewUrl &&
        previewContentType &&
        artifact &&
        selected &&
        isDocumentPreview(previewContentType, selected.entryPath) ? (
          <Suspense fallback={<ArtifactLoadingState />}>
            <ArtifactDocumentPreview
              contentType={previewContentType}
              entryPath={selected.entryPath}
              expectedCurrentVersion={artifact.versionCount}
              onSheetChange={onSheetChange}
              organizationId={organizationId}
              organizationSlug={organizationSlug}
              selectedSheet={sheet}
              slug={slug}
              version={selected.number}
            />
          </Suspense>
        ) : previewUrl && artifact && selected ? (
          <iframe
            key={`${slug}:${selected.number}:${previewUrl}`}
            className="artifact-frame"
            src={previewUrl}
            title={`${artifact.title} version ${selected.number}`}
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads allow-modals"
            referrerPolicy="no-referrer"
          />
        ) : null}
      </main>
      <DeleteArtifactDialog
        artifact={deleteDialogOpen ? artifact : null}
        organizationId={organizationId}
        onOpenChange={setDeleteDialogOpen}
        onDeleted={() => location.assign('/artifacts')}
      />
    </div>
  )
}

function isDocumentPreview(contentType: string, entryPath: string): boolean {
  const type = contentType.split(';')[0]?.trim().toLowerCase()
  const extension = entryPath.split('.').pop()?.toLowerCase()
  return (
    type === 'text/markdown' ||
    type === 'text/plain' ||
    type === 'text/csv' ||
    type ===
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    ['md', 'markdown', 'txt', 'csv', 'tsv', 'xlsx'].includes(extension ?? '')
  )
}

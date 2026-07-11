import { useEffect, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  Archive,
  ArrowDownAZ,
  Copy,
  Download,
  ExternalLink,
  Grid2X2,
  List as ListIcon,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Search,
  Terminal,
  Trash2,
  Users,
  UserRound,
} from 'lucide-react'
import {
  artifactListResponseSchema,
  artifactResponseSchema,
  type Artifact,
} from '@otterware/contracts'
import { api, formatDate } from '#/lib/api'
import { useCurrentActor } from '@/hooks/use-current-actor'
import { useOrganizations } from '@/hooks/use-organizations'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { AppHeader } from './app-header'
import { AuthGate } from './auth-gate'
import { DeleteArtifactDialog } from './delete-artifact-dialog'

export interface ArtifactListSearch {
  q?: string | undefined
  sort?: 'updated' | 'az' | 'za' | undefined
  status?: 'active' | 'archived' | undefined
  view?: 'grid' | 'list' | undefined
}

export function ArtifactListPage({
  search,
  onSearchChange,
}: {
  search: ArtifactListSearch
  onSearchChange: (
    update: Partial<ArtifactListSearch>,
    options?: { replace?: boolean },
  ) => void
}) {
  const [artifacts, setArtifacts] = useState<Artifact[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [changingId, setChangingId] = useState<string | null>(null)
  const [deletingArtifact, setDeletingArtifact] = useState<Artifact | null>(
    null,
  )
  const { isOwner } = useCurrentActor()
  const { activeOrganization } = useOrganizations()
  const query = search.q ?? ''
  const sort = search.sort ?? 'updated'
  const view = search.view ?? 'grid'
  const status = search.status ?? 'active'

  useEffect(() => {
    setLoading(true)
    setError(null)
    const archived = status === 'archived' ? '&archived=only' : ''
    api<unknown>(`/api/v1/artifacts?limit=100${archived}`)
      .then((result) =>
        setArtifacts(artifactListResponseSchema.parse(result).data),
      )
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false))
  }, [status])

  const visibleArtifacts = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    const matchingStatus = artifacts.filter((artifact) =>
      status === 'archived'
        ? artifact.archivedAt !== null
        : !artifact.archivedAt,
    )
    const result = normalized
      ? matchingStatus.filter((artifact) =>
          [artifact.title, artifact.slug, artifact.description]
            .join(' ')
            .toLowerCase()
            .includes(normalized),
        )
      : [...matchingStatus]
    return result.sort((left, right) => {
      if (sort === 'az') return left.title.localeCompare(right.title)
      if (sort === 'za') return right.title.localeCompare(left.title)
      return right.updatedAt.localeCompare(left.updatedAt)
    })
  }, [artifacts, query, sort, status])

  async function changeArchivedState(artifact: Artifact) {
    setChangingId(artifact.id)
    setError(null)
    try {
      const result = artifactResponseSchema.parse(
        artifact.archivedAt
          ? await api<unknown>(
              `/api/v1/artifacts/${encodeURIComponent(artifact.id)}/restore`,
              { method: 'POST' },
            )
          : await api<unknown>(
              `/api/v1/artifacts/${encodeURIComponent(artifact.id)}`,
              { method: 'DELETE' },
            ),
      )
      setArtifacts((current) =>
        current.map((item) => (item.id === artifact.id ? result.data : item)),
      )
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setChangingId(null)
    }
  }

  return (
    <AuthGate fallback={<ArtifactHomeLoadingState view={view} />}>
      <div className="app-shell">
        <AppHeader />
        <main className="artifact-home">
          <section
            className="artifact-commandbar"
            aria-label="Artifact controls"
          >
            <div className="artifact-titleblock">
              <h1>Artifacts</h1>
              <p>Private work and shared organization deliverables.</p>
            </div>
            <div className="artifact-toolbar">
              <label className="artifact-search-field">
                <Search className="artifact-search-icon" size={16} />
                <Input
                  type="search"
                  placeholder="Search artifacts"
                  value={query}
                  onChange={(event) =>
                    onSearchChange(
                      { q: event.target.value || undefined },
                      { replace: true },
                    )
                  }
                />
              </label>
              <Select
                value={status}
                onValueChange={(value) =>
                  onSearchChange({
                    status: value === 'archived' ? 'archived' : undefined,
                  })
                }
              >
                <SelectTrigger className="artifact-status-trigger">
                  {status === 'active' ? (
                    <Grid2X2 size={15} />
                  ) : (
                    <Archive size={15} />
                  )}
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={sort}
                onValueChange={(value) =>
                  onSearchChange({
                    sort: value === 'az' || value === 'za' ? value : undefined,
                  })
                }
              >
                <SelectTrigger className="artifact-sort-trigger">
                  <ArrowDownAZ size={16} />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="updated">Recently updated</SelectItem>
                  <SelectItem value="az">Ascending (A–Z)</SelectItem>
                  <SelectItem value="za">Descending (Z–A)</SelectItem>
                </SelectContent>
              </Select>
              <ToggleGroup
                value={[view]}
                onValueChange={(values) => {
                  const next = values[0]
                  if (next === 'grid' || next === 'list') {
                    onSearchChange({
                      view: next === 'list' ? 'list' : undefined,
                    })
                  }
                }}
                variant="outline"
                spacing={0}
                size="sm"
                aria-label="Artifact layout"
              >
                <ToggleGroupItem value="list" aria-label="List view">
                  <ListIcon size={17} />
                </ToggleGroupItem>
                <ToggleGroupItem value="grid" aria-label="Grid view">
                  <Grid2X2 size={16} />
                </ToggleGroupItem>
              </ToggleGroup>
              <Badge variant="outline">
                {visibleArtifacts.length}{' '}
                {visibleArtifacts.length === 1 ? 'artifact' : 'artifacts'}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      size="sm"
                      type="button"
                      aria-label="Publish artifact"
                    />
                  }
                >
                  <Plus size={15} /> Publish
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="publish-menu">
                  <DropdownMenuLabel>Publish with the CLI</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() =>
                      void navigator.clipboard.writeText(
                        'otterware artifacts create ./dist --slug <slug> --title "<title>" --visibility private --label "Initial version"',
                      )
                    }
                  >
                    <Terminal size={14} /> Copy publish command
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      void navigator.clipboard.writeText(
                        'npm install --global otterware@latest',
                      )
                    }
                  >
                    <Copy size={14} /> Copy install command
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    render={
                      <a
                        href="https://github.com/ckafrouni/otterware#artifact-commands"
                        target="_blank"
                        rel="noreferrer"
                      />
                    }
                  >
                    <ExternalLink size={14} /> CLI documentation
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </section>

          {error && (
            <div className="empty-panel error-panel">
              <strong>Could not load artifacts</strong>
              <p>{error}</p>
              {error.includes('organization') && (
                <Link to="/settings">Create an organization</Link>
              )}
            </div>
          )}
          {!loading && !error && artifacts.length === 0 && (
            <div className="empty-panel">
              {status === 'archived' ? (
                <h2>No archived artifacts</h2>
              ) : (
                <>
                  <h2>No artifacts yet</h2>
                  <p>
                    Install the CLI and run{' '}
                    <code>otterware artifacts create</code>.
                  </p>
                </>
              )}
            </div>
          )}
          {!loading &&
            !error &&
            artifacts.length > 0 &&
            visibleArtifacts.length === 0 && (
              <div className="empty-panel compact-empty">
                {query
                  ? `No ${status} artifacts match “${query}”.`
                  : status === 'archived'
                    ? 'No archived artifacts.'
                    : 'No active artifacts.'}
              </div>
            )}
          <section
            className={view === 'grid' ? 'artifact-grid' : 'artifact-list-view'}
            aria-label="Artifacts"
          >
            {loading ? (
              <ArtifactCardSkeletons view={view} />
            ) : (
              visibleArtifacts.map((artifact) => (
                <Link
                  key={artifact.id}
                  to="/$organizationSlug/a/$slug"
                  params={{
                    organizationSlug: activeOrganization?.slug ?? 'team',
                    slug: artifact.slug,
                  }}
                  className="artifact-card-link"
                >
                  <Card
                    size="sm"
                    className={
                      view === 'grid'
                        ? 'artifact-card'
                        : 'artifact-card artifact-row'
                    }
                  >
                    <ArtifactCardPreview artifact={artifact} />
                    <div className="artifact-card-body">
                      <div className="visibility-label">
                        {artifact.visibility === 'private' ? (
                          <UserRound size={13} />
                        ) : (
                          <Users size={13} />
                        )}
                        {artifact.visibility === 'private'
                          ? 'Private'
                          : 'Organization'}
                      </div>
                      <h2>{artifact.title}</h2>
                      <p>
                        {artifact.description || 'No description provided.'}
                      </p>
                    </div>
                    <div className="artifact-card-meta">
                      <span>
                        v{artifact.currentVersion?.number ?? 1} ·{' '}
                        {formatDate(artifact.updatedAt)}
                      </span>
                      <div className="artifact-card-actions">
                        <Button
                          variant="outline"
                          size="icon-xs"
                          type="button"
                          aria-label="Copy artifact URL"
                          onClick={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                            void navigator.clipboard.writeText(artifact.url)
                          }}
                        >
                          <Copy size={14} />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="outline"
                                size="icon-xs"
                                type="button"
                                aria-label="Artifact actions"
                                disabled={changingId === artifact.id}
                                onClick={(event) => {
                                  event.preventDefault()
                                  event.stopPropagation()
                                }}
                              />
                            }
                          >
                            <MoreHorizontal size={14} />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="artifact-actions-menu"
                          >
                            <DropdownMenuItem
                              render={
                                <a
                                  href={`/api/v1/artifacts/${encodeURIComponent(artifact.id)}/download`}
                                  download
                                  onClick={(event) => event.stopPropagation()}
                                />
                              }
                            >
                              <Download size={14} /> Download
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant={
                                artifact.archivedAt ? 'default' : 'destructive'
                              }
                              onClick={() => void changeArchivedState(artifact)}
                            >
                              {artifact.archivedAt ? (
                                <RotateCcw size={14} />
                              ) : (
                                <Archive size={14} />
                              )}
                              {artifact.archivedAt ? 'Restore' : 'Archive'}
                            </DropdownMenuItem>
                            {artifact.archivedAt && isOwner && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => setDeletingArtifact(artifact)}
                                >
                                  <Trash2 size={14} />
                                  Delete permanently
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))
            )}
          </section>
          <DeleteArtifactDialog
            artifact={deletingArtifact}
            onOpenChange={(open) => {
              if (!open) setDeletingArtifact(null)
            }}
            onDeleted={(deleted) => {
              setArtifacts((current) =>
                current.filter((artifact) => artifact.id !== deleted.id),
              )
              setDeletingArtifact(null)
            }}
          />
        </main>
      </div>
    </AuthGate>
  )
}

function ArtifactHomeLoadingState({ view }: { view: 'grid' | 'list' }) {
  return (
    <div className="app-shell artifact-home-loading" role="status">
      <header className="app-header" aria-hidden="true">
        <div className="home-loading-navigation">
          <div className="home-loading-brand" />
          <div className="home-loading-team" />
          <div className="home-loading-nav" />
        </div>
        <div className="home-loading-user" />
      </header>
      <main className="artifact-home">
        <section className="artifact-commandbar" aria-hidden="true">
          <div className="artifact-titleblock">
            <div className="home-loading-heading" />
            <div className="home-loading-subtitle" />
          </div>
          <div className="artifact-toolbar">
            <div className="home-loading-search" />
            <div className="home-loading-filter" />
            <div className="home-loading-sort" />
            <div className="home-loading-layout" />
            <div className="home-loading-count" />
            <div className="home-loading-publish" />
          </div>
        </section>
        <section
          className={view === 'grid' ? 'artifact-grid' : 'artifact-list-view'}
          aria-hidden="true"
        >
          <ArtifactCardSkeletons view={view} />
        </section>
      </main>
      <span className="sr-only">Loading artifacts…</span>
    </div>
  )
}

function ArtifactCardSkeletons({ view }: { view: 'grid' | 'list' }) {
  return Array.from({ length: view === 'grid' ? 8 : 6 }, (_, index) => (
    <div
      className={
        view === 'grid'
          ? 'artifact-card artifact-card-skeleton'
          : 'artifact-card artifact-row artifact-card-skeleton'
      }
      key={index}
    >
      <div className="artifact-preview" />
      <div className="artifact-card-body">
        <div className="skeleton-line skeleton-label" />
        <div className="skeleton-line skeleton-title" />
        <div className="skeleton-line skeleton-description" />
      </div>
      <div className="artifact-card-meta">
        <div className="skeleton-line skeleton-meta" />
      </div>
    </div>
  ))
}

function ArtifactCardPreview({ artifact }: { artifact: Artifact }) {
  return (
    <div className="artifact-preview" aria-hidden="true">
      {artifact.thumbnailUrl ? (
        <img
          src={artifact.thumbnailUrl}
          alt=""
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div className="preview-placeholder">
          <span>{artifact.title.slice(0, 1).toUpperCase()}</span>
        </div>
      )}
    </div>
  )
}

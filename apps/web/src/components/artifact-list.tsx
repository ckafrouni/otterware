import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Archive,
  ArrowDownAZ,
  CircleDot,
  Copy,
  Download,
  FileBox,
  Grid2X2,
  List as ListIcon,
  MoreHorizontal,
  PanelRightClose,
  PanelRightOpen,
  RotateCcw,
  Search,
  Trash2,
  Upload,
} from 'lucide-react'
import {
  artifactListResponseSchema,
  artifactResponseSchema,
  type Artifact,
} from '@otterware/contracts'
import { api, formatDate } from '#/lib/api'
import { artifactBootstrapQuery } from '#/lib/artifact-query'
import { readSessionCache, writeSessionCache } from '#/lib/session-cache'
import { useCurrentActor } from '@/hooks/use-current-actor'
import { useOrganizations } from '@/hooks/use-organizations'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { UPLOAD_ARTIFACT_EVENT } from './command-palette'
import { DeleteArtifactDialog } from './delete-artifact-dialog'
import { UploadArtifactDialog } from './upload-artifact-dialog'

const INSIGHTS_OPEN_KEY = 'otterdrive:insights-open'
const INSIGHTS_WIDTH_KEY = 'otterdrive:insights-width'
const INSIGHTS_MIN_WIDTH = 220
const INSIGHTS_MAX_WIDTH = 520
const INSIGHTS_DEFAULT_WIDTH = 280

function readStored<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

function useInsightsPanel() {
  const [open, setOpen] = useState(true)
  const [width, setWidth] = useState(INSIGHTS_DEFAULT_WIDTH)
  useEffect(() => {
    setOpen(readStored(INSIGHTS_OPEN_KEY, true))
    setWidth(readStored(INSIGHTS_WIDTH_KEY, INSIGHTS_DEFAULT_WIDTH))
  }, [])
  const toggle = useCallback(() => {
    setOpen((current) => {
      window.localStorage.setItem(INSIGHTS_OPEN_KEY, JSON.stringify(!current))
      return !current
    })
  }, [])
  const startResize = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      event.preventDefault()
      const startX = event.clientX
      let current = width
      const onMove = (move: PointerEvent) => {
        current = Math.min(
          INSIGHTS_MAX_WIDTH,
          Math.max(INSIGHTS_MIN_WIDTH, width + (startX - move.clientX)),
        )
        setWidth(current)
      }
      const onUp = () => {
        window.localStorage.setItem(INSIGHTS_WIDTH_KEY, JSON.stringify(current))
        document.body.classList.remove('is-resizing')
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
      }
      document.body.classList.add('is-resizing')
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [width],
  )
  return { open, width, toggle, startResize }
}

export interface ArtifactListSearch {
  q?: string | undefined
  sort?: 'updated' | 'az' | 'za' | undefined
  status?: 'active' | 'archived' | undefined
  view?: 'grid' | 'list' | undefined
  page?: number | undefined
}

const PAGE_SIZE = 50

function paginationItems(
  current: number,
  total: number,
): Array<number | 'ellipsis'> {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1)
  const anchors = [...new Set([1, current - 1, current, current + 1, total])]
    .filter((page) => page >= 1 && page <= total)
    .sort((left, right) => left - right)
  const items: Array<number | 'ellipsis'> = []
  let previous = 0
  for (const page of anchors) {
    if (page - previous === 2) items.push(previous + 1)
    else if (page - previous > 2) items.push('ellipsis')
    items.push(page)
    previous = page
  }
  return items
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
  const [actionError, setActionError] = useState<string | null>(null)
  const [changingId, setChangingId] = useState<string | null>(null)
  const [deletingArtifact, setDeletingArtifact] = useState<Artifact | null>(
    null,
  )
  const [uploadOpen, setUploadOpen] = useState(false)
  const insights = useInsightsPanel()
  const navigate = useNavigate()
  const { activeOrganization, loaded, organizations } = useOrganizations()

  useEffect(() => {
    const onUpload = () => setUploadOpen(true)
    window.addEventListener(UPLOAD_ARTIFACT_EVENT, onUpload)
    return () => window.removeEventListener(UPLOAD_ARTIFACT_EVENT, onUpload)
  }, [])
  const { isOwner } = useCurrentActor(
    activeOrganization?.id,
    Boolean(activeOrganization),
  )
  const queryClient = useQueryClient()
  const query = search.q ?? ''
  const sort = search.sort ?? 'updated'
  const view = search.view ?? 'list'
  const status = search.status ?? 'active'

  const artifactsQueryKey = [
    'artifacts',
    activeOrganization?.id ?? 'none',
    status,
  ] as const
  const artifactsStorageKey = `otterdrive:artifacts:${activeOrganization?.id ?? 'none'}:${status}`
  const storedArtifacts = readSessionCache<Artifact[]>(
    artifactsStorageKey,
    60_000,
  )
  const artifactsQuery = useQuery({
    enabled: Boolean(activeOrganization?.id),
    queryKey: artifactsQueryKey,
    queryFn: async () => {
      const archived = status === 'archived' ? '&archived=only' : ''
      const result = await api<unknown>(
        `/api/v1/artifacts?limit=100${archived}`,
        { organizationId: activeOrganization!.id },
      )
      return writeSessionCache(
        artifactsStorageKey,
        artifactListResponseSchema.parse(result).data,
      )
    },
    ...(activeOrganization && storedArtifacts
      ? {
          initialData: storedArtifacts.value,
          initialDataUpdatedAt: storedArtifacts.savedAt,
        }
      : {}),
    staleTime: 60_000,
  })
  const artifacts = artifactsQuery.data ?? []
  const noTeam = loaded && organizations.length === 0
  const loading = !noTeam && (!activeOrganization || artifactsQuery.isPending)
  const error =
    actionError ??
    (artifactsQuery.error instanceof Error
      ? artifactsQuery.error.message
      : null)

  function setArtifacts(update: (current: Artifact[]) => Artifact[]) {
    queryClient.setQueryData<Artifact[]>(artifactsQueryKey, (current = []) => {
      const next = update(current)
      return writeSessionCache(artifactsStorageKey, next)
    })
  }

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

  const totalPages = Math.max(1, Math.ceil(visibleArtifacts.length / PAGE_SIZE))
  const currentPage = Math.min(search.page ?? 1, totalPages)
  const pagedArtifacts = visibleArtifacts.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  )

  function goToPage(page: number) {
    onSearchChange({ page: page <= 1 ? undefined : page })
  }

  async function changeArchivedState(artifact: Artifact) {
    setChangingId(artifact.id)
    setActionError(null)
    try {
      const result = artifactResponseSchema.parse(
        artifact.archivedAt
          ? await api<unknown>(
              `/api/v1/artifacts/${encodeURIComponent(artifact.id)}/restore`,
              { method: 'POST', organizationId: activeOrganization?.id },
            )
          : await api<unknown>(
              `/api/v1/artifacts/${encodeURIComponent(artifact.id)}`,
              { method: 'DELETE', organizationId: activeOrganization?.id },
            ),
      )
      setArtifacts((current) =>
        current.map((item) => (item.id === artifact.id ? result.data : item)),
      )
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setChangingId(null)
    }
  }

  return (
    <AuthGate fallback={<ArtifactHomeLoadingState view={view} />}>
      <div className="app-shell app-frame">
        <AppHeader
          actions={
            <div className="artifact-toolbar" aria-label="Artifact controls">
              <label className="artifact-search-field">
                <Search className="artifact-search-icon" size={16} />
                <Input
                  type="search"
                  placeholder="Search artifacts"
                  value={query}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                      event.preventDefault()
                      event.currentTarget.blur()
                    }
                  }}
                  onChange={(event) =>
                    onSearchChange(
                      { q: event.target.value || undefined, page: undefined },
                      { replace: true },
                    )
                  }
                />
              </label>
              <Button
                type="button"
                aria-label="Upload artifact"
                disabled={!activeOrganization}
                onClick={() => setUploadOpen(true)}
              >
                <Upload size={15} /> Upload
              </Button>
            </div>
          }
        />
        <main className="artifact-home">
          <div className="artifact-body">
            <div className="artifact-main">
              <div className="artifact-viewbar">
                <button
                  type="button"
                  className="view-chip"
                  aria-pressed={status === 'active'}
                  onClick={() =>
                    onSearchChange({ status: undefined, page: undefined })
                  }
                >
                  <CircleDot /> Active
                </button>
                <button
                  type="button"
                  className="view-chip"
                  aria-pressed={status === 'archived'}
                  onClick={() =>
                    onSearchChange({ status: 'archived', page: undefined })
                  }
                >
                  <Archive /> Archived
                </button>
                <span className="artifact-viewbar-spacer" />
                <Select
                  value={sort}
                  onValueChange={(value) =>
                    onSearchChange({
                      sort:
                        value === 'az' || value === 'za' ? value : undefined,
                      page: undefined,
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
                        view: next === 'grid' ? 'grid' : undefined,
                      })
                    }
                  }}
                  variant="outline"
                  spacing={0}
                  aria-label="Artifact layout"
                >
                  <ToggleGroupItem value="list" aria-label="List view">
                    <ListIcon size={17} />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="grid" aria-label="Grid view">
                    <Grid2X2 size={16} />
                  </ToggleGroupItem>
                </ToggleGroup>
                <button
                  type="button"
                  className="insights-toggle"
                  aria-label={
                    insights.open
                      ? 'Hide overview panel'
                      : 'Show overview panel'
                  }
                  aria-pressed={insights.open}
                  onClick={insights.toggle}
                >
                  {insights.open ? (
                    <PanelRightClose size={16} />
                  ) : (
                    <PanelRightOpen size={16} />
                  )}
                </button>
              </div>
              <div className="artifact-scroll">
                {error && (
                  <div className="empty-panel error-panel">
                    <strong>Could not load artifacts</strong>
                    <p>{error}</p>
                    {error.includes('organization') && (
                      <Link to="/settings">Create an organization</Link>
                    )}
                  </div>
                )}
                {noTeam && !error && (
                  <div className="empty-panel">
                    <h2>Create your first team</h2>
                    <p>
                      Artifacts live in a team workspace. Create one in{' '}
                      <Link to="/settings">Settings</Link> to get started.
                    </p>
                  </div>
                )}
                {!noTeam && !loading && !error && artifacts.length === 0 && (
                  <div className="empty-panel">
                    {status === 'archived' ? (
                      <h2>No archived artifacts</h2>
                    ) : (
                      <>
                        <h2>No artifacts yet</h2>
                        <p>
                          Install the CLI and run{' '}
                          <code>otterdrive artifacts create</code>.
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
                  className={
                    view === 'grid' ? 'artifact-grid' : 'artifact-list-view'
                  }
                  aria-label="Artifacts"
                >
                  {loading ? (
                    <ArtifactCardSkeletons view={view} />
                  ) : (
                    pagedArtifacts.map((artifact) => (
                      <Link
                        key={artifact.id}
                        to="/$organizationSlug/a/$slug"
                        params={{
                          organizationSlug: activeOrganization?.slug ?? 'team',
                          slug: artifact.slug,
                        }}
                        className="artifact-card-link"
                        onFocus={() => {
                          if (activeOrganization)
                            void queryClient.prefetchQuery(
                              artifactBootstrapQuery(
                                activeOrganization.id,
                                artifact.slug,
                              ),
                            )
                        }}
                        onMouseEnter={() => {
                          if (activeOrganization)
                            void queryClient.prefetchQuery(
                              artifactBootstrapQuery(
                                activeOrganization.id,
                                artifact.slug,
                              ),
                            )
                        }}
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
                            <h2>{artifact.title}</h2>
                            <p>
                              {artifact.description ||
                                'No description provided.'}
                            </p>
                          </div>
                          <div className="artifact-card-meta">
                            <span>
                              <span className="version-chip">
                                v{artifact.currentVersion?.number ?? 1}
                              </span>
                              {view === 'list'
                                ? formatShortDate(artifact.updatedAt)
                                : formatDate(artifact.updatedAt)}
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
                                  void navigator.clipboard.writeText(
                                    artifact.url,
                                  )
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
                                        onClick={(event) =>
                                          event.stopPropagation()
                                        }
                                      />
                                    }
                                  >
                                    <Download size={14} /> Download
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    variant={
                                      artifact.archivedAt
                                        ? 'default'
                                        : 'destructive'
                                    }
                                    onClick={() =>
                                      void changeArchivedState(artifact)
                                    }
                                  >
                                    {artifact.archivedAt ? (
                                      <RotateCcw size={14} />
                                    ) : (
                                      <Archive size={14} />
                                    )}
                                    {artifact.archivedAt
                                      ? 'Restore'
                                      : 'Archive'}
                                  </DropdownMenuItem>
                                  {artifact.archivedAt && isOwner && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        variant="destructive"
                                        onClick={() =>
                                          setDeletingArtifact(artifact)
                                        }
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
              </div>
              {!loading && !error && !noTeam && visibleArtifacts.length > 0 && (
                <footer className="artifact-list-footer">
                  <span>
                    {visibleArtifacts.length}{' '}
                    {visibleArtifacts.length === 1 ? 'artifact' : 'artifacts'}
                  </span>
                  {totalPages > 1 && (
                    <Pagination className="artifact-pagination">
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            aria-disabled={currentPage === 1}
                            className={
                              currentPage === 1
                                ? 'pagination-disabled'
                                : undefined
                            }
                            onClick={() => {
                              if (currentPage > 1) goToPage(currentPage - 1)
                            }}
                          />
                        </PaginationItem>
                        {paginationItems(currentPage, totalPages).map(
                          (item, index) =>
                            item === 'ellipsis' ? (
                              <PaginationItem key={`ellipsis-${index}`}>
                                <PaginationEllipsis />
                              </PaginationItem>
                            ) : (
                              <PaginationItem key={item}>
                                <PaginationLink
                                  isActive={item === currentPage}
                                  onClick={() => goToPage(item)}
                                >
                                  {item}
                                </PaginationLink>
                              </PaginationItem>
                            ),
                        )}
                        <PaginationItem>
                          <PaginationNext
                            aria-disabled={currentPage === totalPages}
                            className={
                              currentPage === totalPages
                                ? 'pagination-disabled'
                                : undefined
                            }
                            onClick={() => {
                              if (currentPage < totalPages)
                                goToPage(currentPage + 1)
                            }}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  )}
                </footer>
              )}
            </div>
            {!noTeam && !error && insights.open && (
              <ArtifactInsights
                artifacts={artifacts}
                visible={visibleArtifacts}
                status={status}
                loading={loading}
                organizationSlug={activeOrganization?.slug ?? 'team'}
                width={insights.width}
                onResizeStart={insights.startResize}
              />
            )}
          </div>
          <UploadArtifactDialog
            open={uploadOpen}
            organizationId={activeOrganization?.id}
            onOpenChange={setUploadOpen}
            onUploaded={(uploaded) => {
              setArtifacts((current) => [
                uploaded,
                ...current.filter((artifact) => artifact.id !== uploaded.id),
              ])
              void navigate({
                to: '/$organizationSlug/a/$slug',
                params: {
                  organizationSlug: activeOrganization?.slug ?? 'team',
                  slug: uploaded.slug,
                },
              })
            }}
          />
          <DeleteArtifactDialog
            artifact={deletingArtifact}
            {...(activeOrganization
              ? { organizationId: activeOrganization.id }
              : {})}
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
    <div className="app-shell app-frame" role="status">
      <AppHeader />
      <main className="artifact-home">
        <div className="artifact-body">
          <div className="artifact-main">
            <div className="artifact-scroll">
              <section
                className={
                  view === 'grid' ? 'artifact-grid' : 'artifact-list-view'
                }
                aria-hidden="true"
              >
                <ArtifactCardSkeletons view={view} />
              </section>
            </div>
          </div>
          <aside className="artifact-insights" aria-hidden="true" />
        </div>
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
  const [failed, setFailed] = useState(false)
  return (
    <div className="artifact-preview" aria-hidden="true">
      {artifact.thumbnailUrl && !failed ? (
        <img
          src={artifact.thumbnailUrl}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="preview-placeholder">
          <span>{artifact.title.slice(0, 1).toUpperCase()}</span>
        </div>
      )}
    </div>
  )
}

const shortDate = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
})

function formatShortDate(value: string): string {
  return shortDate.format(new Date(value))
}

function relativeTime(value: string): string {
  const diff = Date.now() - new Date(value).getTime()
  const minutes = Math.round(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.round(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.round(months / 12)}y ago`
}
function ArtifactInsights({
  artifacts,
  visible,
  status,
  loading,
  organizationSlug,
  width,
  onResizeStart,
}: {
  artifacts: Artifact[]
  visible: Artifact[]
  status: 'active' | 'archived'
  loading: boolean
  organizationSlug: string
  width: number
  onResizeStart: (event: React.PointerEvent<HTMLElement>) => void
}) {
  const inStatus = artifacts.filter((artifact) =>
    status === 'archived' ? artifact.archivedAt !== null : !artifact.archivedAt,
  )
  const versions = inStatus.reduce(
    (total, artifact) => total + artifact.versionCount,
    0,
  )
  const recent = [...inStatus]
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, 5)
  const revised = [...inStatus]
    .filter((artifact) => artifact.versionCount > 1)
    .sort((left, right) => right.versionCount - left.versionCount)
    .slice(0, 3)
  const week = Date.now() - 7 * 24 * 60 * 60 * 1000
  const updatedThisWeek = inStatus.filter(
    (artifact) => new Date(artifact.updatedAt).getTime() >= week,
  ).length

  const style = { width, flexBasis: width }
  if (loading)
    return (
      <aside className="artifact-insights" style={style} aria-hidden="true" />
    )

  return (
    <aside
      className="artifact-insights"
      style={style}
      aria-label="Workspace overview"
    >
      <div
        className="insights-resize-handle"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize overview panel"
        onPointerDown={onResizeStart}
      />
      <div className="insight-section">
        <div className="insight-row">
          <span>Artifacts</span>
          <strong>
            {visible.length === inStatus.length
              ? inStatus.length
              : `${visible.length} of ${inStatus.length}`}
          </strong>
        </div>
        <div className="insight-row">
          <span>Versions</span>
          <strong>{versions}</strong>
        </div>
        <div className="insight-row">
          <span>Updated this week</span>
          <strong>{updatedThisWeek}</strong>
        </div>
      </div>
      {recent.length > 0 && (
        <div className="insight-section">
          <h4>Recently updated</h4>
          {recent.map((artifact) => (
            <Link
              key={artifact.id}
              className="insight-link"
              to="/$organizationSlug/a/$slug"
              params={{ organizationSlug, slug: artifact.slug }}
            >
              <FileBox />
              <span>{artifact.title}</span>
              <small>{relativeTime(artifact.updatedAt)}</small>
            </Link>
          ))}
        </div>
      )}
      {revised.length > 0 && (
        <div className="insight-section">
          <h4>Most revised</h4>
          {revised.map((artifact) => (
            <Link
              key={artifact.id}
              className="insight-link"
              to="/$organizationSlug/a/$slug"
              params={{ organizationSlug, slug: artifact.slug }}
            >
              <FileBox />
              <span>{artifact.title}</span>
              <small>v{artifact.versionCount}</small>
            </Link>
          ))}
        </div>
      )}
    </aside>
  )
}

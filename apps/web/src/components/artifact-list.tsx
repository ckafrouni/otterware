import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Archive,
  ArrowDownAZ,
  Bot,
  ChevronRight,
  CircleDot,
  Columns3,
  Copy,
  Download,
  Eye,
  Grid2X2,
  List as ListIcon,
  MoreHorizontal,
  RotateCcw,
  Search,
  Share2,
  Trash2,
  Upload,
  User,
  Users,
} from 'lucide-react'
import {
  artifactListResponseSchema,
  artifactResponseSchema,
  type Artifact,
} from '@otterware/contracts'
import { api, formatDate } from '#/lib/api'
import {
  formatBytes,
  getArtifactFormat,
  isAgentActor,
} from '#/lib/artifact-helpers'
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
import { FinderFileList } from './finder-file-list'
import { FinderInspectorPane } from './finder-inspector-pane'
import { QuickLookDialog } from './quick-look-dialog'
import { ShareArtifactDialog } from './share-artifact-dialog'
import { ShareSpaceDialog } from './share-space-dialog'
import { UploadArtifactDialog } from './upload-artifact-dialog'

export interface ArtifactListSearch {
  q?: string | undefined
  sort?: 'updated' | 'az' | 'za' | undefined
  status?: 'active' | 'archived' | undefined
  view?: 'columns' | 'grid' | 'list' | undefined
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
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(
    null,
  )
  const [quickLookArtifact, setQuickLookArtifact] = useState<Artifact | null>(
    null,
  )
  const [quickLookOpen, setQuickLookOpen] = useState(false)
  const [shareSpaceOpen, setShareSpaceOpen] = useState(false)
  const [shareArtifact, setShareArtifact] = useState<Artifact | null>(null)
  const [shareArtifactOpen, setShareArtifactOpen] = useState(false)
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
  const view = search.view ?? 'columns'
  const status = search.status ?? 'active'

  const artifactsQueryKey = [
    'artifacts',
    activeOrganization?.id ?? 'none',
    status,
  ] as const
  const artifactsStorageKey = `otterware:artifacts:${activeOrganization?.id ?? 'none'}:${status}`
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
  const artifacts = Array.isArray(artifactsQuery.data)
    ? artifactsQuery.data
    : []
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

  const totalBytes = useMemo(() => {
    return visibleArtifacts.reduce(
      (sum, item) => sum + (item.currentVersion?.byteSize ?? 0),
      0,
    )
  }, [visibleArtifacts])

  const agentCount = useMemo(() => {
    return visibleArtifacts.filter((item) =>
      isAgentActor(item.currentVersion?.createdBy),
    ).length
  }, [visibleArtifacts])

  const quickLookIndex = useMemo(() => {
    if (!quickLookArtifact) return -1
    return visibleArtifacts.findIndex(
      (item) => item.id === quickLookArtifact.id,
    )
  }, [quickLookArtifact, visibleArtifacts])

  const handleNextQuickLook = useCallback(() => {
    if (quickLookIndex >= 0 && quickLookIndex < visibleArtifacts.length - 1) {
      const next = visibleArtifacts[quickLookIndex + 1]
      if (next) setQuickLookArtifact(next)
    }
  }, [quickLookIndex, visibleArtifacts])

  const handlePrevQuickLook = useCallback(() => {
    if (quickLookIndex > 0) {
      const prev = visibleArtifacts[quickLookIndex - 1]
      if (prev) setQuickLookArtifact(prev)
    }
  }, [quickLookIndex, visibleArtifacts])

  const activeArtifact = useMemo(() => {
    if (selectedArtifactId) {
      return (
        visibleArtifacts.find((item) => item.id === selectedArtifactId) ??
        visibleArtifacts[0] ??
        null
      )
    }
    return visibleArtifacts[0] ?? null
  }, [selectedArtifactId, visibleArtifacts])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return
      }

      if (event.key === ' ' || event.key === 'Spacebar') {
        event.preventDefault()
        const targetArtifact =
          (selectedArtifactId
            ? visibleArtifacts.find((a) => a.id === selectedArtifactId)
            : null) ?? visibleArtifacts[0]
        if (targetArtifact) {
          setQuickLookArtifact(targetArtifact)
          setQuickLookOpen((prev) => !prev)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedArtifactId, visibleArtifacts])

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
                variant="outline"
                aria-label="Share space"
                disabled={!activeOrganization}
                onClick={() => setShareSpaceOpen(true)}
              >
                <Users size={15} /> Collaborate
              </Button>
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
                    if (
                      next === 'columns' ||
                      next === 'grid' ||
                      next === 'list'
                    ) {
                      onSearchChange({
                        view: next === 'list' ? undefined : next,
                      })
                    }
                  }}
                  variant="outline"
                  spacing={0}
                  aria-label="Artifact layout"
                >
                  <ToggleGroupItem
                    value="columns"
                    aria-label="Columns view"
                    title="macOS Finder Miller Columns"
                  >
                    <Columns3 size={15} />
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="list"
                    aria-label="List view"
                    title="Linear List View"
                  >
                    <ListIcon size={16} />
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="grid"
                    aria-label="Grid view"
                    title="Gallery Grid View"
                  >
                    <Grid2X2 size={15} />
                  </ToggleGroupItem>
                </ToggleGroup>
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
                    <h2>Create your first space</h2>
                    <p>
                      Artifacts live in a space. Create one in{' '}
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

                {view === 'columns' && !loading && !error && !noTeam ? (
                  <div className="finder-3panel-workspace">
                    <FinderFileList
                      artifacts={visibleArtifacts}
                      selectedArtifactId={activeArtifact?.id ?? null}
                      onSelectArtifact={(artifact) =>
                        setSelectedArtifactId(artifact.id)
                      }
                      onOpenArtifact={(artifact) => {
                        void navigate({
                          to: '/$organizationSlug/a/$slug',
                          params: {
                            organizationSlug:
                              activeOrganization?.slug ?? 'space',
                            slug: artifact.slug,
                          },
                        })
                      }}
                      onQuickLook={(artifact) => {
                        setQuickLookArtifact(artifact)
                        setQuickLookOpen(true)
                      }}
                      status={status}
                      onStatusChange={(newStatus) =>
                        onSearchChange({
                          status:
                            newStatus === 'active' ? undefined : newStatus,
                          page: undefined,
                        })
                      }
                    />
                    <FinderInspectorPane
                      artifact={activeArtifact}
                      organizationSlug={activeOrganization?.slug ?? 'space'}
                      onQuickLook={(artifact) => {
                        setQuickLookArtifact(artifact)
                        setQuickLookOpen(true)
                      }}
                      onShare={(artifact) => {
                        setShareArtifact(artifact)
                        setShareArtifactOpen(true)
                      }}
                      onChangeArchived={(artifact) =>
                        void changeArchivedState(artifact)
                      }
                      onDelete={(artifact) => setDeletingArtifact(artifact)}
                      isOwner={isOwner}
                    />
                  </div>
                ) : (
                  <section
                    className={
                      view === 'grid' ? 'artifact-grid' : 'artifact-list-view'
                    }
                    aria-label="Artifacts"
                  >
                    {loading ? (
                      <ArtifactCardSkeletons view={view} />
                    ) : (
                      pagedArtifacts.map((artifact) => {
                        const format = getArtifactFormat(
                          artifact.currentVersion?.entryPath,
                        )
                        const isAgent = isAgentActor(
                          artifact.currentVersion?.createdBy,
                        )
                        const creatorName =
                          artifact.currentVersion?.createdBy?.name ??
                          (isAgent ? 'AI Agent' : 'Member')
                        const isSelected = selectedArtifactId === artifact.id

                        return (
                          <Link
                            key={artifact.id}
                            to="/$organizationSlug/a/$slug"
                            params={{
                              organizationSlug:
                                activeOrganization?.slug ?? 'space',
                              slug: artifact.slug,
                            }}
                            className={`artifact-card-link ${isSelected ? 'is-selected' : ''}`}
                            onClick={() => setSelectedArtifactId(artifact.id)}
                            onFocus={() => {
                              setSelectedArtifactId(artifact.id)
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
                                <span className="flex items-center gap-1.5 flex-wrap">
                                  <span className="version-chip">
                                    v{artifact.currentVersion?.number ?? 1}
                                  </span>
                                  {isAgent ? (
                                    <span
                                      className="actor-badge actor-agent-compact"
                                      title={`Created by AI Agent: ${creatorName}`}
                                    >
                                      <Bot size={11} />
                                      <span>{creatorName}</span>
                                    </span>
                                  ) : (
                                    <span
                                      className="actor-badge actor-human-compact"
                                      title={`Member: ${creatorName}`}
                                    >
                                      <User size={11} />
                                      <span>{creatorName}</span>
                                    </span>
                                  )}
                                  <span
                                    className={`format-tag-compact ${format.pillClass}`}
                                  >
                                    {format.badge}
                                  </span>
                                  <span className="text-muted-foreground text-[11px]">
                                    {view === 'list'
                                      ? formatShortDate(artifact.updatedAt)
                                      : formatDate(artifact.updatedAt)}
                                  </span>
                                </span>
                                <div className="artifact-card-actions">
                                  <Button
                                    variant="outline"
                                    size="icon-xs"
                                    type="button"
                                    aria-label="Quick Look"
                                    title="Quick Look (Space)"
                                    onClick={(event) => {
                                      event.preventDefault()
                                      event.stopPropagation()
                                      setQuickLookArtifact(artifact)
                                      setQuickLookOpen(true)
                                    }}
                                  >
                                    <Eye size={13} />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="icon-xs"
                                    type="button"
                                    aria-label="Share artifact"
                                    title="Share artifact"
                                    onClick={(event) => {
                                      event.preventDefault()
                                      event.stopPropagation()
                                      setShareArtifact(artifact)
                                      setShareArtifactOpen(true)
                                    }}
                                  >
                                    <Share2 size={13} />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="icon-xs"
                                    type="button"
                                    aria-label="Copy artifact URL"
                                    title="Copy URL"
                                    onClick={(event) => {
                                      event.preventDefault()
                                      event.stopPropagation()
                                      void navigator.clipboard.writeText(
                                        artifact.url,
                                      )
                                    }}
                                  >
                                    <Copy size={13} />
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
                        )
                      })
                    )}
                  </section>
                )}
              </div>
              {!loading && !error && !noTeam && visibleArtifacts.length > 0 && (
                <footer className="artifact-list-footer finder-status-bar">
                  <div className="finder-status-left">
                    <span className="finder-path-item font-medium">
                      {activeOrganization?.name ?? 'Space'}
                    </span>
                    <ChevronRight size={11} className="finder-path-sep" />
                    <span className="finder-path-item">
                      {status === 'archived' ? 'Archived' : 'Active'}
                    </span>
                  </div>
                  <div className="finder-status-center">
                    <span>
                      {visibleArtifacts.length}{' '}
                      {visibleArtifacts.length === 1 ? 'artifact' : 'artifacts'}
                    </span>
                    <span className="dot-sep">·</span>
                    <span>{formatBytes(totalBytes)}</span>
                    {agentCount > 0 && (
                      <>
                        <span className="dot-sep">·</span>
                        <span className="finder-ai-stat">
                          <Bot size={11} className="inline mr-1" />
                          {agentCount} AI generated
                        </span>
                      </>
                    )}
                  </div>
                  <div className="finder-status-right">
                    {totalPages > 1 ? (
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
                    ) : (
                      <div className="finder-keyboard-hints">
                        <kbd>Space</kbd> Quick Look · <kbd>⌘K</kbd> Search
                      </div>
                    )}
                  </div>
                </footer>
              )}
            </div>
          </div>
          <QuickLookDialog
            open={quickLookOpen}
            onOpenChange={setQuickLookOpen}
            artifact={quickLookArtifact}
            organizationSlug={activeOrganization?.slug ?? 'space'}
            onNext={handleNextQuickLook}
            onPrev={handlePrevQuickLook}
            hasNext={
              quickLookIndex >= 0 &&
              quickLookIndex < visibleArtifacts.length - 1
            }
            hasPrev={quickLookIndex > 0}
          />
          <ShareSpaceDialog
            open={shareSpaceOpen}
            onOpenChange={setShareSpaceOpen}
            spaceId={activeOrganization?.id}
            spaceName={activeOrganization?.name}
          />
          <ShareArtifactDialog
            open={shareArtifactOpen}
            onOpenChange={setShareArtifactOpen}
            artifact={shareArtifact}
          />
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
                  organizationSlug: activeOrganization?.slug ?? 'space',
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

function ArtifactHomeLoadingState({
  view,
}: {
  view: 'grid' | 'list' | 'columns'
}) {
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

function ArtifactCardSkeletons({
  view,
}: {
  view: 'grid' | 'list' | 'columns'
}) {
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

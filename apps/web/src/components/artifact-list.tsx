import { useEffect, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  ArrowDownAZ,
  Copy,
  Grid2X2,
  List as ListIcon,
  Plus,
  Search,
  Users,
  UserRound,
} from 'lucide-react'
import { artifactListResponseSchema, type Artifact } from '@otterware/contracts'
import { api, formatDate } from '#/lib/api'
import { Badge } from '@/components/ui/badge'
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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { AppHeader } from './app-header'
import { AuthGate } from './auth-gate'

export function ArtifactListPage() {
  const [artifacts, setArtifacts] = useState<Artifact[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<'updated' | 'az' | 'za'>('updated')
  const [view, setView] = useState<'grid' | 'list'>('grid')

  useEffect(() => {
    api<unknown>('/api/v1/artifacts')
      .then((result) =>
        setArtifacts(artifactListResponseSchema.parse(result).data),
      )
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem('otterware-artifact-view')
    if (saved === 'grid' || saved === 'list') setView(saved)
  }, [])

  const visibleArtifacts = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    const result = normalized
      ? artifacts.filter((artifact) =>
          [artifact.title, artifact.slug, artifact.description]
            .join(' ')
            .toLowerCase()
            .includes(normalized),
        )
      : [...artifacts]
    return result.sort((left, right) => {
      if (sort === 'az') return left.title.localeCompare(right.title)
      if (sort === 'za') return right.title.localeCompare(left.title)
      return right.updatedAt.localeCompare(left.updatedAt)
    })
  }, [artifacts, query, sort])

  function chooseView(next: 'grid' | 'list') {
    setView(next)
    localStorage.setItem('otterware-artifact-view', next)
  }

  return (
    <AuthGate>
      <div className="app-shell">
        <AppHeader />
        <main className="artifact-home">
          <section className="page-heading artifact-heading">
            <div>
              <p className="eyebrow">Workspace</p>
              <h1>Artifacts</h1>
              <p>Private work and shared organization deliverables.</p>
            </div>
            <div className="heading-actions">
              <Badge variant="outline">
                {visibleArtifacts.length}{' '}
                {visibleArtifacts.length === 1 ? 'artifact' : 'artifacts'}
              </Badge>
              <Button
                size="sm"
                type="button"
                disabled
                title="Use the CLI to publish"
              >
                <Plus size={15} /> Publish
              </Button>
            </div>
          </section>

          <section className="artifact-toolbar" aria-label="Artifact controls">
            <label className="artifact-search-field">
              <Search className="artifact-search-icon" size={16} />
              <Input
                type="search"
                placeholder="Search artifacts"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <Select
              value={sort}
              onValueChange={(value) =>
                setSort(value as 'updated' | 'az' | 'za')
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
                if (next === 'grid' || next === 'list') chooseView(next)
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
          </section>

          {loading && <div className="empty-panel">Loading artifacts…</div>}
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
              <h2>No artifacts yet</h2>
              <p>
                Install the CLI and run <code>otterware artifacts create</code>.
              </p>
            </div>
          )}
          {!loading &&
            !error &&
            artifacts.length > 0 &&
            visibleArtifacts.length === 0 && (
              <div className="empty-panel compact-empty">
                No artifacts match “{query}”.
              </div>
            )}
          <section
            className={view === 'grid' ? 'artifact-grid' : 'artifact-list-view'}
            aria-label="Artifacts"
          >
            {visibleArtifacts.map((artifact) => (
              <Link
                key={artifact.id}
                to="/a/$slug"
                params={{ slug: artifact.slug }}
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
                    <p>{artifact.description || 'No description provided.'}</p>
                  </div>
                  <div className="artifact-card-meta">
                    <span>
                      v{artifact.currentVersion?.number ?? 1} ·{' '}
                      {formatDate(artifact.updatedAt)}
                    </span>
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
                  </div>
                </Card>
              </Link>
            ))}
          </section>
        </main>
      </div>
    </AuthGate>
  )
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

import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Copy, Plus, Users, UserRound } from 'lucide-react'
import { artifactListResponseSchema, type Artifact } from '@otterware/contracts'
import { api, formatDate } from '#/lib/api'
import { AppHeader } from './app-header'
import { AuthGate } from './auth-gate'

export function ArtifactListPage() {
  const [artifacts, setArtifacts] = useState<Artifact[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api<unknown>('/api/v1/artifacts')
      .then((result) =>
        setArtifacts(artifactListResponseSchema.parse(result).data),
      )
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <AuthGate>
      <div className="app-shell">
        <AppHeader />
        <main className="artifact-home">
          <section className="page-heading">
            <div>
              <p className="eyebrow">Workspace</p>
              <h1>Artifacts</h1>
              <p>
                Private work and shared organization deliverables, with
                immutable history.
              </p>
            </div>
            <div className="heading-actions">
              <span className="count-badge">
                {artifacts.length}{' '}
                {artifacts.length === 1 ? 'artifact' : 'artifacts'}
              </span>
              <button
                className="primary-button"
                type="button"
                disabled
                title="Use the CLI to publish"
              >
                <Plus size={15} /> Publish with CLI
              </button>
            </div>
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
          <section className="artifact-grid" aria-label="Artifacts">
            {artifacts.map((artifact) => (
              <Link
                key={artifact.id}
                to="/a/$slug"
                params={{ slug: artifact.slug }}
                className="artifact-card"
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
                  <button
                    className="copy-button"
                    type="button"
                    aria-label="Copy artifact URL"
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      void navigator.clipboard.writeText(artifact.url)
                    }}
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </Link>
            ))}
          </section>
        </main>
      </div>
    </AuthGate>
  )
}

function ArtifactCardPreview({ artifact }: { artifact: Artifact }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    api<{ data: { url: string } }>(`/api/v1/artifacts/${artifact.id}/preview`)
      .then((result) => setUrl(result.data.url))
      .catch(() => setUrl(null))
  }, [artifact.id])

  return (
    <div className="artifact-preview" aria-hidden="true">
      {url ? (
        <iframe
          src={url}
          tabIndex={-1}
          loading="lazy"
          sandbox="allow-same-origin allow-scripts"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="preview-placeholder">
          <span>{artifact.title.slice(0, 1).toUpperCase()}</span>
        </div>
      )}
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ChevronDown, Copy, Home, Pencil } from 'lucide-react'
import {
  artifactResponseSchema,
  artifactVersionsResponseSchema,
  type Artifact,
  type ArtifactVersion,
} from '@otterware/contracts'
import { api, formatDate } from '#/lib/api'
import { AuthGate } from './auth-gate'

interface PreviewResponse {
  data: {
    url: string
    expiresAt: string
    version: ArtifactVersion
  }
}

export function ArtifactViewer({
  slug,
  version,
}: {
  slug: string
  version?: number
}) {
  const [artifact, setArtifact] = useState<Artifact | null>(null)
  const [versions, setVersions] = useState<ArtifactVersion[]>([])
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  const selected = useMemo(
    () =>
      versions.find((item) => item.number === version) ??
      versions.find((item) => item.id === artifact?.currentVersion?.id) ??
      artifact?.currentVersion ??
      null,
    [artifact, version, versions],
  )

  useEffect(() => {
    setError(null)
    Promise.all([
      api<unknown>(`/api/v1/artifacts/${encodeURIComponent(slug)}`),
      api<unknown>(`/api/v1/artifacts/${encodeURIComponent(slug)}/versions`),
    ])
      .then(([artifactResult, versionsResult]) => {
        setArtifact(artifactResponseSchema.parse(artifactResult).data)
        setVersions(artifactVersionsResponseSchema.parse(versionsResult).data)
      })
      .catch((reason: Error) => setError(reason.message))
  }, [slug])

  useEffect(() => {
    if (!artifact || !selected) return
    api<PreviewResponse>(
      `/api/v1/artifacts/${artifact.id}/preview?version=${selected.number}`,
    )
      .then((result) => setPreviewUrl(result.data.url))
      .catch((reason: Error) => setError(reason.message))
  }, [artifact, selected])

  const copy = (value: string) => navigator.clipboard.writeText(value)

  return (
    <AuthGate>
      <div className="viewer-shell">
        <header className="viewer-header">
          <div className="viewer-left">
            <Link
              to="/artifacts"
              className="viewer-icon"
              aria-label="Back to artifacts"
            >
              <Home size={15} />
            </Link>
            {artifact && selected ? (
              <div className="version-control">
                <button
                  className="version-trigger"
                  type="button"
                  onClick={() => setMenuOpen((open) => !open)}
                >
                  <strong>{artifact.title}</strong>
                  {versions.length > 1 && <ChevronDown size={15} />}
                </button>
                {menuOpen && versions.length > 1 && (
                  <div className="version-menu">
                    {versions.map((item) => (
                      <Link
                        key={item.id}
                        to="/a/$slug/$version"
                        params={{
                          slug: artifact.slug,
                          version: `v${item.number}`,
                        }}
                        className={
                          item.number === selected.number ? 'active' : ''
                        }
                        onClick={() => setMenuOpen(false)}
                      >
                        <strong>v{item.number}</strong>
                        <span>{item.label}</span>
                        <small>{formatDate(item.createdAt)}</small>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <strong>Otterware Artifact</strong>
            )}
            {artifact && (
              <span className="viewer-byline">
                {artifact.visibility === 'private'
                  ? 'Private artifact'
                  : 'Organization artifact'}
              </span>
            )}
            {selected && versions.length > 1 && (
              <span className="version-pill">v{selected.number}</span>
            )}
          </div>
          <div className="viewer-actions">
            <button
              className="viewer-icon"
              type="button"
              aria-label="Copy edit prompt"
              onClick={() =>
                void copy(
                  `Edit my Otterware artifact at ${artifact?.url}. Read the current version first and publish a new immutable version with the Otterware CLI.`,
                )
              }
            >
              <Pencil size={15} />
            </button>
            <button
              className="share-button"
              type="button"
              onClick={() => artifact && void copy(artifact.url)}
            >
              <Copy size={14} /> Share
            </button>
          </div>
        </header>
        <main className="viewer-main">
          {error && <div className="viewer-message error-panel">{error}</div>}
          {!error && !previewUrl && (
            <div className="viewer-message">Loading artifact…</div>
          )}
          {previewUrl && artifact && selected && (
            <iframe
              className="artifact-frame"
              src={previewUrl}
              title={`${artifact.title} version ${selected.number}`}
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads allow-modals"
              referrerPolicy="no-referrer"
            />
          )}
        </main>
      </div>
    </AuthGate>
  )
}

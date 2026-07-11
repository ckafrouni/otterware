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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
    const controller = new AbortController()
    setPreviewUrl(null)
    setError(null)
    const query = version ? `?version=${version}` : ''
    api<PreviewResponse>(
      `/api/v1/artifacts/${encodeURIComponent(slug)}/preview${query}`,
      { signal: controller.signal },
    )
      .then((result) => {
        if (!controller.signal.aborted) setPreviewUrl(result.data.url)
      })
      .catch((reason: Error) => {
        if (!controller.signal.aborted) setError(reason.message)
      })

    return () => controller.abort()
  }, [slug, version])

  const copy = (value: string) => navigator.clipboard.writeText(value)

  return (
    <AuthGate>
      <div className="viewer-shell">
        <header className="viewer-header">
          <div className="viewer-left">
            <Button
              render={<Link to="/artifacts" />}
              variant="outline"
              size="icon-xs"
              aria-label="Back to artifacts"
            >
              <Home size={13} />
            </Button>
            {artifact && selected ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="xs"
                      className="version-trigger"
                    />
                  }
                >
                  <strong>{artifact.title}</strong>
                  {versions.length > 1 && <ChevronDown size={13} />}
                </DropdownMenuTrigger>
                {versions.length > 1 && (
                  <DropdownMenuContent align="start" className="version-menu">
                    {versions.map((item) => (
                      <DropdownMenuItem
                        key={item.id}
                        render={
                          <Link
                            to="/a/$slug/$version"
                            params={{
                              slug: artifact.slug,
                              version: `v${item.number}`,
                            }}
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
                {artifact.visibility === 'private'
                  ? 'Private artifact'
                  : 'Organization artifact'}
              </span>
            )}
            {selected && versions.length > 1 && (
              <Badge variant="outline">v{selected.number}</Badge>
            )}
          </div>
          <div className="viewer-actions">
            <Button
              variant="outline"
              size="icon-xs"
              type="button"
              aria-label="Copy edit prompt"
              onClick={() =>
                void copy(
                  `Edit my Otterware artifact at ${artifact?.url}. Read the current version first and publish a new immutable version with the Otterware CLI.`,
                )
              }
            >
              <Pencil size={13} />
            </Button>
            <Button
              variant="outline"
              size="xs"
              type="button"
              onClick={() => artifact && void copy(artifact.url)}
            >
              <Copy size={12} /> Share
            </Button>
          </div>
        </header>
        <main className="viewer-main">
          {error && <div className="viewer-message error-panel">{error}</div>}
          {!error && !previewUrl && (
            <div className="viewer-message">Loading artifact…</div>
          )}
          {previewUrl && artifact && selected && (
            <iframe
              key={`${slug}:${selected.number}:${previewUrl}`}
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

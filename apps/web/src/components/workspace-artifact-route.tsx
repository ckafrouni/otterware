import { useEffect, useRef, useState } from 'react'
import { ArtifactViewer } from './artifact-viewer'
import { AuthGate } from './auth-gate'
import { useOrganizations } from '@/hooks/use-organizations'

export function WorkspaceArtifactRoute({
  organizationSlug,
  ...viewerProps
}: {
  organizationSlug: string
  onSheetChange?: ((sheet: string | undefined) => void) | undefined
  sheet?: string | undefined
  slug: string
  version?: number
}) {
  const { activeOrganization, loaded, organizations, selectOrganization } =
    useOrganizations()
  const [error, setError] = useState<string | null>(null)
  const switching = useRef(false)
  const requestedOrganization = organizations.find(
    (organization) => organization.slug === organizationSlug,
  )

  useEffect(() => {
    if (
      !loaded ||
      !requestedOrganization ||
      requestedOrganization.id === activeOrganization?.id ||
      switching.current
    ) {
      return
    }
    switching.current = true
    void selectOrganization(requestedOrganization.id).catch(
      (reason: unknown) => {
        switching.current = false
        setError(reason instanceof Error ? reason.message : String(reason))
      },
    )
  }, [
    activeOrganization?.id,
    loaded,
    requestedOrganization,
    selectOrganization,
  ])

  return (
    <AuthGate>
      {error ? (
        <div className="viewer-message error-panel">{error}</div>
      ) : loaded && !requestedOrganization ? (
        <div className="viewer-message error-panel">
          You do not have access to the “{organizationSlug}” team.
        </div>
      ) : requestedOrganization?.id === activeOrganization?.id ? (
        <ArtifactViewer organizationSlug={organizationSlug} {...viewerProps} />
      ) : (
        <div className="viewer-message">Switching to {organizationSlug}…</div>
      )}
    </AuthGate>
  )
}

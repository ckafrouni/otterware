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
  const { loaded, organizations } = useOrganizations()
  const requestedOrganization = organizations.find(
    (organization) => organization.slug === organizationSlug,
  )

  return (
    <AuthGate>
      {loaded && !requestedOrganization ? (
        <div className="viewer-message error-panel">
          You do not have access to the “{organizationSlug}” team.
        </div>
      ) : requestedOrganization ? (
        <ArtifactViewer
          organizationId={requestedOrganization.id}
          organizationSlug={organizationSlug}
          {...viewerProps}
        />
      ) : (
        <div className="viewer-message">Opening {organizationSlug}…</div>
      )}
    </AuthGate>
  )
}

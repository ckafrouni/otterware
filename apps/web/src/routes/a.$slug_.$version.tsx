import { createFileRoute, Navigate } from '@tanstack/react-router'
import { z } from 'zod'
import { useOrganizations } from '#/hooks/use-organizations'
import { ArtifactLoadingState } from '#/components/artifact-loading-state'

export const Route = createFileRoute('/a/$slug_/$version')({
  validateSearch: z.object({
    sheet: z.string().trim().min(1).max(100).optional().catch(undefined),
  }),
  component: VersionRoute,
})

function VersionRoute() {
  const { slug, version } = Route.useParams()
  const { sheet } = Route.useSearch()
  const { activeOrganization, loaded } = useOrganizations()
  if (!loaded || !activeOrganization) return <ArtifactLoadingState />
  return (
    <Navigate
      to="/$organizationSlug/a/$slug/$version"
      params={{ organizationSlug: activeOrganization.slug, slug, version }}
      search={sheet ? { sheet } : {}}
      replace
    />
  )
}

import { createFileRoute, Navigate } from '@tanstack/react-router'
import { z } from 'zod'
import { useOrganizations } from '#/hooks/use-organizations'
import { ArtifactLoadingState } from '#/components/artifact-loading-state'

export const Route = createFileRoute('/a/$slug')({
  validateSearch: z.object({
    sheet: z.string().trim().min(1).max(100).optional().catch(undefined),
  }),
  component: ArtifactRoute,
})

function ArtifactRoute() {
  const { slug } = Route.useParams()
  const { sheet } = Route.useSearch()
  const { activeOrganization, loaded } = useOrganizations()
  if (!loaded || !activeOrganization) return <ArtifactLoadingState />
  return (
    <Navigate
      to="/$organizationSlug/a/$slug"
      params={{ organizationSlug: activeOrganization.slug, slug }}
      search={sheet ? { sheet } : {}}
      replace
    />
  )
}

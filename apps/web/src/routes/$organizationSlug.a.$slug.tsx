import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { WorkspaceArtifactRoute } from '#/components/workspace-artifact-route'

export const Route = createFileRoute('/$organizationSlug/a/$slug')({
  validateSearch: z.object({
    sheet: z.string().trim().min(1).max(100).optional().catch(undefined),
  }),
  component: ArtifactRoute,
})

function ArtifactRoute() {
  const { organizationSlug, slug } = Route.useParams()
  const { sheet } = Route.useSearch()
  const navigate = Route.useNavigate()
  return (
    <WorkspaceArtifactRoute
      organizationSlug={organizationSlug}
      slug={slug}
      {...(sheet ? { sheet } : {})}
      onSheetChange={(nextSheet) =>
        void navigate({ search: nextSheet ? { sheet: nextSheet } : {} })
      }
    />
  )
}

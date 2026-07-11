import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { WorkspaceArtifactRoute } from '#/components/workspace-artifact-route'

export const Route = createFileRoute('/$organizationSlug/a/$slug_/$version')({
  validateSearch: z.object({
    sheet: z.string().trim().min(1).max(100).optional().catch(undefined),
  }),
  component: VersionRoute,
})

function VersionRoute() {
  const { organizationSlug, slug, version } = Route.useParams()
  const { sheet } = Route.useSearch()
  const navigate = Route.useNavigate()
  const number = Number(version.replace(/^v/, ''))
  return (
    <WorkspaceArtifactRoute
      key={`${organizationSlug}:${slug}:v${number}`}
      organizationSlug={organizationSlug}
      slug={slug}
      {...(sheet ? { sheet } : {})}
      onSheetChange={(nextSheet) =>
        void navigate({ search: nextSheet ? { sheet: nextSheet } : {} })
      }
      {...(Number.isInteger(number) ? { version: number } : {})}
    />
  )
}

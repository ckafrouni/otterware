import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { ArtifactViewer } from '#/components/artifact-viewer'

export const Route = createFileRoute('/a/$slug')({
  validateSearch: z.object({
    sheet: z.string().trim().min(1).max(100).optional().catch(undefined),
  }),
  component: ArtifactRoute,
})

function ArtifactRoute() {
  const { slug } = Route.useParams()
  const { sheet } = Route.useSearch()
  const navigate = Route.useNavigate()
  return (
    <ArtifactViewer
      slug={slug}
      {...(sheet ? { sheet } : {})}
      onSheetChange={(nextSheet) =>
        void navigate({
          search: nextSheet ? { sheet: nextSheet } : {},
        })
      }
    />
  )
}

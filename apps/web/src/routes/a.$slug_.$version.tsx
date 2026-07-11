import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { ArtifactViewer } from '#/components/artifact-viewer'

export const Route = createFileRoute('/a/$slug_/$version')({
  validateSearch: z.object({
    sheet: z.string().trim().min(1).max(100).optional().catch(undefined),
  }),
  component: VersionRoute,
})

function VersionRoute() {
  const { slug, version } = Route.useParams()
  const { sheet } = Route.useSearch()
  const navigate = Route.useNavigate()
  const number = Number(version.replace(/^v/, ''))
  return (
    <ArtifactViewer
      key={`${slug}:v${number}`}
      slug={slug}
      {...(sheet ? { sheet } : {})}
      onSheetChange={(nextSheet) =>
        void navigate({
          search: nextSheet ? { sheet: nextSheet } : {},
        })
      }
      {...(Number.isInteger(number) ? { version: number } : {})}
    />
  )
}

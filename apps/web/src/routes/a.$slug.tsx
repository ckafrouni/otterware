import { createFileRoute } from '@tanstack/react-router'
import { ArtifactViewer } from '#/components/artifact-viewer'

export const Route = createFileRoute('/a/$slug')({
  component: ArtifactRoute,
})

function ArtifactRoute() {
  const { slug } = Route.useParams()
  return <ArtifactViewer slug={slug} />
}

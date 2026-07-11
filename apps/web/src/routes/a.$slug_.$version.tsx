import { createFileRoute } from '@tanstack/react-router'
import { ArtifactViewer } from '#/components/artifact-viewer'

export const Route = createFileRoute('/a/$slug_/$version')({
  component: VersionRoute,
})

function VersionRoute() {
  const { slug, version } = Route.useParams()
  const number = Number(version.replace(/^v/, ''))
  return (
    <ArtifactViewer
      key={`${slug}:v${number}`}
      slug={slug}
      {...(Number.isInteger(number) ? { version: number } : {})}
    />
  )
}

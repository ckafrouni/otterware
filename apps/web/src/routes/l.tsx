import { createFileRoute } from '@tanstack/react-router'
import { ArtifactListPage } from '#/components/artifact-list'

export const Route = createFileRoute('/l')({ component: ArtifactListPage })

import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import {
  ArtifactListPage,
  type ArtifactListSearch,
} from '#/components/artifact-list'

export const artifactListSearchSchema = z.object({
  q: z.string().max(200).optional().catch(undefined),
  sort: z.enum(['updated', 'az', 'za']).optional().catch(undefined),
  status: z.enum(['active', 'archived']).optional().catch(undefined),
  view: z.enum(['grid', 'list']).optional().catch(undefined),
  page: z.number().int().min(1).optional().catch(undefined),
})

export const Route = createFileRoute('/artifacts')({
  validateSearch: artifactListSearchSchema,
  component: ArtifactListRoute,
})

function ArtifactListRoute() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  function updateSearch(
    update: Partial<ArtifactListSearch>,
    options?: { replace?: boolean },
  ) {
    void navigate({
      search: (current) => ({ ...current, ...update }),
      ...(options?.replace === undefined ? {} : { replace: options.replace }),
    })
  }

  return <ArtifactListPage search={search} onSearchChange={updateSearch} />
}

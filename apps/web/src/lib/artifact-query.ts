import { queryOptions } from '@tanstack/react-query'
import { artifactResponseSchema } from '@otterware/contracts'
import type { Artifact, ArtifactVersion } from '@otterware/contracts'
import { api } from './api'
import { readSessionCache, writeSessionCache } from './session-cache'

interface ArtifactBootstrapResponse {
  data: {
    artifact: Artifact
    versions: ArtifactVersion[]
    preview: {
      url: string
      expiresAt: string
      version: ArtifactVersion
      contentType: string
    }
  }
}

export function artifactBootstrapQuery(
  organizationId: string,
  slug: string,
  version?: number,
) {
  const storageKey = `otterware:artifact:${organizationId}:${slug}:${version ?? 'current'}`
  const stored = readSessionCache<{
    artifact: Artifact
    versions: ArtifactVersion[]
    preview: ArtifactBootstrapResponse['data']['preview']
  }>(storageKey, 4 * 60_000)
  return queryOptions({
    queryKey: [
      'artifact-bootstrap',
      organizationId,
      slug,
      version ?? 'current',
    ],
    queryFn: async () => {
      const query = version ? `?version=${version}` : ''
      const result = await api<ArtifactBootstrapResponse>(
        `/api/v1/artifacts/${encodeURIComponent(slug)}/bootstrap${query}`,
        { organizationId },
      )
      return writeSessionCache(storageKey, {
        artifact: artifactResponseSchema.parse({ data: result.data.artifact })
          .data,
        preview: result.data.preview,
        versions: result.data.versions,
      })
    },
    ...(stored
      ? { initialData: stored.value, initialDataUpdatedAt: stored.savedAt }
      : {}),
    staleTime: 4 * 60_000,
  })
}

import { useQuery } from '@tanstack/react-query'
import { api } from '#/lib/api'

interface CurrentActorResponse {
  data: {
    roles: string[]
  }
}

export function useCurrentActor(organizationId?: string, enabled = true) {
  const query = useQuery({
    enabled,
    queryKey: ['actor', organizationId ?? 'active'],
    queryFn: () => api<CurrentActorResponse>('/api/v1/me', { organizationId }),
    staleTime: 5 * 60_000,
  })
  const roles = query.data?.data.roles ?? []

  return { isOwner: roles.includes('owner'), roles, loading: query.isPending }
}

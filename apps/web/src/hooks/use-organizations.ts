import { useCallback, useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { authClient } from '#/lib/auth-client'
import { readSessionCache, writeSessionCache } from '#/lib/session-cache'

export interface OrganizationSummary {
  id: string
  name: string
  slug: string
}

export function useOrganizations() {
  const session = authClient.useSession()
  const queryClient = useQueryClient()
  const userId = session.data?.user.id
  const queryKey = ['organizations', userId] as const
  const storageKey = `otterware:organizations:${userId ?? 'anonymous'}`
  const stored = readSessionCache<OrganizationSummary[]>(storageKey, 5 * 60_000)
  const organizationsQuery = useQuery({
    enabled: Boolean(userId),
    queryFn: async () => {
      const result = await authClient.organization.list()
      if (result.error) throw new Error(result.error.message)
      return writeSessionCache(
        storageKey,
        (result.data ?? []) as OrganizationSummary[],
      )
    },
    ...(stored
      ? { initialData: stored.value, initialDataUpdatedAt: stored.savedAt }
      : {}),
    queryKey,
    staleTime: 5 * 60_000,
  })
  const organizations = organizationsQuery.data ?? []
  const loaded = Boolean(userId) && !organizationsQuery.isPending

  useEffect(() => {
    const refresh = () => void queryClient.invalidateQueries({ queryKey })
    window.addEventListener('otterware:organizations-changed', refresh)
    return () => {
      window.removeEventListener('otterware:organizations-changed', refresh)
    }
  }, [queryClient, userId])

  const activeOrganization = useMemo(() => {
    const activeId = session.data?.session.activeOrganizationId
    return (
      organizations.find((organization) => organization.id === activeId) ??
      organizations[0] ??
      null
    )
  }, [organizations, session.data?.session.activeOrganizationId])

  const selectOrganization = useCallback(
    async (organizationId: string) => {
      if (organizationId === activeOrganization?.id) return
      const result = await authClient.organization.setActive({ organizationId })
      if (result.error) throw new Error(result.error.message)
      await session.refetch()
      await queryClient.invalidateQueries({ queryKey: ['actor'] })
      await queryClient.invalidateQueries({ queryKey: ['artifacts'] })
    },
    [activeOrganization?.id, queryClient, session],
  )

  return { activeOrganization, loaded, organizations, selectOrganization }
}

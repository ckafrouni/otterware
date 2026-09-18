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
  const safeStored = stored && Array.isArray(stored.value) ? stored : undefined
  const organizationsQuery = useQuery({
    enabled: Boolean(userId),
    queryFn: async () => {
      const result = await authClient.organization.list()
      if (result.error) throw new Error(result.error.message)
      const list = Array.isArray(result.data)
        ? result.data
        : Array.isArray((result.data as any)?.data)
          ? (result.data as any).data
          : []
      return writeSessionCache(storageKey, list as OrganizationSummary[])
    },
    ...(safeStored
      ? {
          initialData: safeStored.value,
          initialDataUpdatedAt: safeStored.savedAt,
        }
      : {}),
    queryKey,
    staleTime: 5 * 60_000,
  })
  const rawOrgs = organizationsQuery.data
  const organizations: OrganizationSummary[] = useMemo(() => {
    if (Array.isArray(rawOrgs)) return rawOrgs as OrganizationSummary[]
    if (
      rawOrgs &&
      typeof rawOrgs === 'object' &&
      Array.isArray((rawOrgs as any).data)
    ) {
      return (rawOrgs as any).data as OrganizationSummary[]
    }
    return []
  }, [rawOrgs])
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

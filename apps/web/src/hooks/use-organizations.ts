import { useCallback, useEffect, useMemo, useState } from 'react'
import { authClient } from '#/lib/auth-client'

export interface OrganizationSummary {
  id: string
  name: string
  slug: string
}

export function useOrganizations() {
  const session = authClient.useSession()
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!session.data) return
    let active = true
    const refresh = () => {
      authClient.organization.list().then((result) => {
        if (active) {
          setOrganizations((result.data ?? []) as OrganizationSummary[])
          setLoaded(true)
        }
      })
    }
    refresh()
    window.addEventListener('otterware:organizations-changed', refresh)
    return () => {
      active = false
      window.removeEventListener('otterware:organizations-changed', refresh)
    }
  }, [session.data])

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
      location.reload()
    },
    [activeOrganization?.id, session],
  )

  return { activeOrganization, loaded, organizations, selectOrganization }
}

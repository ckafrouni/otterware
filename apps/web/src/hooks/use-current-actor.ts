import { useEffect, useState } from 'react'
import { api } from '#/lib/api'

interface CurrentActorResponse {
  data: {
    roles: string[]
  }
}

export function useCurrentActor() {
  const [roles, setRoles] = useState<string[]>([])

  useEffect(() => {
    let active = true
    api<CurrentActorResponse>('/api/v1/me')
      .then((result) => {
        if (active) setRoles(result.data.roles)
      })
      .catch(() => {
        if (active) setRoles([])
      })
    return () => {
      active = false
    }
  }, [])

  return { isOwner: roles.includes('owner'), roles }
}

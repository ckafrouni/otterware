export type Env = Cloudflare.Env

export interface AuthenticatedActor {
  type: 'user' | 'api_key'
  id: string
  name: string
  userId: string | null
  organizationId: string
  roles: string[]
  permissions: Record<string, string[]>
}

import type { OtterwareAuth } from './auth'
import { HttpError } from './http'
import type { AuthenticatedActor, Env } from './types'

interface SessionShape {
  session: {
    activeOrganizationId?: string | null
  }
  user: {
    id: string
    name: string
    email: string
  }
}

interface MemberRow {
  id: string
  organizationId: string
  role: string
}

export async function authenticate(
  request: Request,
  env: Env,
  auth: OtterwareAuth,
): Promise<AuthenticatedActor> {
  const apiKeyValue = request.headers.get('x-api-key')
  if (apiKeyValue) {
    const result = await auth.api.verifyApiKey({
      body: { key: apiKeyValue, configId: 'organization' },
    })
    if (!result.valid || !result.key) {
      throw new HttpError(401, 'invalid_api_key', 'The API key is invalid.')
    }
    return {
      type: 'api_key',
      id: result.key.id,
      name: result.key.name ?? result.key.start ?? 'API key',
      userId: null,
      organizationId: result.key.referenceId,
      roles: ['api_key'],
      permissions: result.key.permissions ?? {},
    }
  }

  const session = (await auth.api.getSession({
    headers: request.headers,
  })) as SessionShape | null
  if (!session) {
    throw new HttpError(401, 'unauthenticated', 'Please log in to Otterware.')
  }

  const requestedOrganization = request.headers.get('x-otterware-organization')
  const organizationId =
    requestedOrganization ?? session.session.activeOrganizationId ?? null
  const member = organizationId
    ? await env.DB.prepare(
        'SELECT id, organizationId, role FROM member WHERE userId = ? AND organizationId = ?',
      )
        .bind(session.user.id, organizationId)
        .first<MemberRow>()
    : await env.DB.prepare(
        'SELECT id, organizationId, role FROM member WHERE userId = ? ORDER BY createdAt LIMIT 1',
      )
        .bind(session.user.id)
        .first<MemberRow>()

  if (!member) {
    throw new HttpError(
      403,
      'organization_required',
      'Select or create an organization before managing artifacts.',
    )
  }

  return {
    type: 'user',
    id: session.user.id,
    name: session.user.name || session.user.email,
    userId: session.user.id,
    organizationId: member.organizationId,
    roles: member.role.split(',').map((role: string) => role.trim()),
    permissions: {},
  }
}

export function assertCanWrite(
  actor: AuthenticatedActor,
  action: 'create' | 'update' | 'archive' = 'update',
): void {
  if (
    actor.type === 'api_key' &&
    !actor.permissions.artifact?.includes(action)
  ) {
    throw new HttpError(
      403,
      'forbidden',
      `This API key does not have artifact:${action} permission.`,
    )
  }
  if (
    actor.type === 'user' &&
    !actor.roles.some((role) => ['owner', 'admin', 'editor'].includes(role))
  ) {
    throw new HttpError(
      403,
      'forbidden',
      'Your organization role cannot modify artifacts.',
    )
  }
}

export function canReadWithKey(actor: AuthenticatedActor): boolean {
  return (
    actor.type !== 'api_key' ||
    actor.permissions.artifact?.includes('read') === true
  )
}

export function assertCanManageKeys(actor: AuthenticatedActor): void {
  if (
    actor.type !== 'user' ||
    !actor.roles.some((role) => ['owner', 'admin'].includes(role))
  ) {
    throw new HttpError(
      403,
      'forbidden',
      'Only organization owners and admins can manage API keys.',
    )
  }
}

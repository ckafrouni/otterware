import { APIError } from 'better-auth/api'
import type { Env } from './types'

export type PlatformRole = 'admin' | 'user'

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function isPlatformAdmin(env: Env, email: string): boolean {
  return normalizeEmail(email) === normalizeEmail(env.ADMIN_EMAIL)
}

export async function authorizeNewUser(
  env: Env,
  email: string,
): Promise<PlatformRole> {
  const normalizedEmail = normalizeEmail(email)
  if (isPlatformAdmin(env, normalizedEmail)) return 'admin'

  const invitation = await env.DB.prepare(
    `SELECT id
       FROM invitation
      WHERE lower(email) = ? AND status = 'pending'
      LIMIT 1`,
  )
    .bind(normalizedEmail)
    .first<{ id: string }>()

  if (!invitation) {
    throw new APIError('FORBIDDEN', {
      message: 'Signups are disabled. Ask an administrator for an invitation.',
    })
  }

  return 'user'
}

import { describe, expect, it, vi } from 'vitest'
import {
  authorizeNewUser,
  isPlatformAdmin,
  normalizeEmail,
} from './auth-policy'
import type { Env } from './types'

function environment(invitationId: string | null): Env {
  const statement = {
    bind: vi.fn().mockReturnThis(),
    first: vi
      .fn()
      .mockResolvedValue(invitationId === null ? null : { id: invitationId }),
  }
  return {
    ADMIN_EMAIL: 'chris.kafrouni@gmail.com',
    GOOGLE_CLIENT_ID: '',
    GOOGLE_CLIENT_SECRET: '',
    DB: {
      prepare: vi.fn(() => statement),
    } as unknown as D1Database,
  } as Env
}

describe('closed signup policy', () => {
  it('normalizes the configured deployment admin email', () => {
    const env = environment(null)
    expect(normalizeEmail('  Chris.Kafrouni@GMAIL.com ')).toBe(
      'chris.kafrouni@gmail.com',
    )
    expect(isPlatformAdmin(env, 'Chris.Kafrouni@gmail.com')).toBe(true)
  })

  it('grants the configured admin only when verified OAuth is enabled', async () => {
    await expect(
      authorizeNewUser(environment(null), 'chris.kafrouni@gmail.com'),
    ).rejects.toThrow('Signups are disabled')

    const env = environment(null)
    env.GOOGLE_CLIENT_ID = 'client-id'
    env.GOOGLE_CLIENT_SECRET = 'client-secret'
    await expect(
      authorizeNewUser(env, 'Chris.Kafrouni@gmail.com'),
    ).resolves.toBe('admin')
    expect(env.DB.prepare).not.toHaveBeenCalled()
  })

  it('allows an invited email with the regular user role', async () => {
    await expect(
      authorizeNewUser(environment('invite-1'), 'colleague@example.com'),
    ).resolves.toBe('user')
  })

  it('rejects an uninvited email', async () => {
    await expect(
      authorizeNewUser(environment(null), 'stranger@example.com'),
    ).rejects.toThrow('Signups are disabled')
  })
})

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

  it('never grants the configured admin through public signup', async () => {
    await expect(
      authorizeNewUser(environment(null), 'chris.kafrouni@gmail.com'),
    ).rejects.toThrow('Signups are disabled')
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

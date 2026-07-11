import { describe, expect, it, vi } from 'vitest'
import { authenticate } from './actor'
import type { Env } from './types'
import type { OtterwareAuth } from './auth'

describe('bearer authentication fast path', () => {
  it('loads the user and requested membership in one D1 query', async () => {
    const first = vi.fn().mockResolvedValue({
      userId: 'user-1',
      name: 'Chris',
      email: 'chris@example.com',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      id: 'member-1',
      organizationId: 'organization-1',
      role: 'owner',
    })
    const bind = vi.fn(() => ({ first }))
    const prepare = vi.fn(() => ({ bind }))
    const getSession = vi.fn()
    const actor = await authenticate(
      new Request('https://app.otterware.dev/api/v1/me', {
        headers: {
          authorization: 'Bearer raw-session.signed-value',
          'x-otterware-organization': 'organization-1',
        },
      }),
      { DB: { prepare } as unknown as D1Database } as Env,
      { api: { getSession } } as unknown as OtterwareAuth,
    )

    expect(bind).toHaveBeenCalledWith('organization-1', 'raw-session')
    expect(getSession).not.toHaveBeenCalled()
    expect(actor).toMatchObject({
      userId: 'user-1',
      organizationId: 'organization-1',
      roles: ['owner'],
    })
  })
})

import { describe, expect, it } from 'vitest'
import { signContentGrant, startContentSession } from './content'
import type { Env } from './types'

function testEnv(): Env {
  return {
    APP_URL: 'http://localhost:3000',
    CONTENT_URL: 'http://localhost:3000',
    ADMIN_EMAIL: 'chris.kafrouni@gmail.com',
    BETTER_AUTH_SECRET: 'auth-secret-at-least-thirty-two-characters',
    CONTENT_SIGNING_KEY: 'content-secret-at-least-thirty-two-characters',
    GOOGLE_CLIENT_ID: '',
    GOOGLE_CLIENT_SECRET: '',
    DB: {} as D1Database,
    ARTIFACTS: {} as R2Bucket,
    ASSETS: {} as Fetcher,
  }
}

describe('content grants', () => {
  it('creates a scoped content session with a host-only cookie', async () => {
    const env = testEnv()
    const token = await signContentGrant(env, {
      artifactId: 'artifact-1',
      versionId: 'version-1',
      entryPath: 'index.html',
    })
    const response = await startContentSession(
      new Request(`http://localhost:3000/raw/session/${token}`),
      env,
      token,
    )

    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/raw/a/artifact-1/version-1/index.html',
    )
    expect(response.headers.get('set-cookie')).toContain(
      'Path=/raw/a/artifact-1/version-1/',
    )
    expect(response.headers.get('set-cookie')).not.toContain('Domain=')
  })
})

import { legacyAppRedirect } from './host-policy'
import { describe, expect, it } from 'vitest'
import { isAllowedHostPath, isApplicationAsset } from './host-policy'
import type { Env } from './types'

const env = {
  APP_URL: 'https://drive.otterware.dev',
  CONTENT_URL: 'https://usercontent.otterware.dev',
} as Env

describe('production host isolation', () => {
  it('serves application routes only on the app host', () => {
    expect(
      isAllowedHostPath(new Request('https://drive.otterware.dev/login'), env),
    ).toBe(true)
    expect(
      isAllowedHostPath(
        new Request('https://usercontent.otterware.dev/login'),
        env,
      ),
    ).toBe(false)
  })

  it('serves raw routes only on the content host', () => {
    expect(
      isAllowedHostPath(
        new Request('https://usercontent.otterware.dev/raw/session/grant'),
        env,
      ),
    ).toBe(true)
    expect(
      isAllowedHostPath(
        new Request('https://usercontent.otterware.dev/raw/thumbnail/grant'),
        env,
      ),
    ).toBe(true)
    expect(
      isAllowedHostPath(
        new Request('https://drive.otterware.dev/raw/session/grant'),
        env,
      ),
    ).toBe(false)
    expect(
      isAllowedHostPath(
        new Request('https://usercontent.otterware.dev/raw/not-a-route'),
        env,
      ),
    ).toBe(false)
  })

  it('allows local development and rejects unknown production hosts', () => {
    expect(
      isAllowedHostPath(new Request('http://localhost:3000/login'), env),
    ).toBe(true)
    expect(
      isAllowedHostPath(new Request('https://example.com/login'), env),
    ).toBe(false)
  })

  it('serves application routes on the worker preview host', () => {
    expect(
      isAllowedHostPath(
        new Request('https://abcd1234-otterware.chris.workers.dev/login'),
        env,
      ),
    ).toBe(true)
    expect(
      isAllowedHostPath(
        new Request('https://otterware.chris.workers.dev/login'),
        env,
      ),
    ).toBe(true)
    expect(
      isAllowedHostPath(
        new Request(
          'https://abcd1234-otterware.chris.workers.dev/raw/session/grant',
        ),
        env,
      ),
    ).toBe(false)
    expect(
      isAllowedHostPath(
        new Request('https://other-worker.chris.workers.dev/login'),
        env,
      ),
    ).toBe(false)
    expect(
      isApplicationAsset(
        new Request(
          'https://abcd1234-otterware.chris.workers.dev/assets/app.js',
        ),
        env,
      ),
    ).toBe(true)
  })

  it('serves static application assets only on the app host', () => {
    expect(
      isApplicationAsset(
        new Request('https://drive.otterware.dev/assets/app.js'),
        env,
      ),
    ).toBe(true)
    expect(
      isApplicationAsset(
        new Request('https://drive.otterware.dev/manifest.json'),
        env,
      ),
    ).toBe(true)
    expect(
      isApplicationAsset(
        new Request('https://drive.otterware.dev/favicon.svg'),
        env,
      ),
    ).toBe(true)
    expect(
      isApplicationAsset(
        new Request('https://usercontent.otterware.dev/assets/app.js'),
        env,
      ),
    ).toBe(false)
  })
})

describe('legacy app links', () => {
  it('redirects shared links with their path and query preserved', () => {
    const response = legacyAppRedirect(
      new Request('https://app.otterware.dev/a/report?version=2'),
      env,
    )
    expect(response?.status).toBe(308)
    expect(response?.headers.get('location')).toBe(
      'https://drive.otterware.dev/a/report?version=2',
    )
  })
  it.each([
    'https://app.otterware.dev/raw/session/grant',
    'https://app.otterware.dev/api/v1/me',
    'https://usercontent.otterware.dev/login',
    'https://drive.otterware.dev/login',
  ])('does not redirect API, content, or unrelated requests: %s', (url) => {
    expect(legacyAppRedirect(new Request(url), env)).toBeNull()
  })
  it('does not redirect mutations', () => {
    expect(
      legacyAppRedirect(
        new Request('https://app.otterware.dev/login', { method: 'POST' }),
        env,
      ),
    ).toBeNull()
  })
})

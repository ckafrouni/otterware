import { describe, expect, it } from 'vitest'
import { isAllowedHostPath, isApplicationAsset } from './host-policy'
import type { Env } from './types'

const env = {
  APP_URL: 'https://app.otterware.dev',
  CONTENT_URL: 'https://usercontent.otterware.dev',
} as Env

describe('production host isolation', () => {
  it('serves application routes only on the app host', () => {
    expect(
      isAllowedHostPath(new Request('https://app.otterware.dev/login'), env),
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
        new Request('https://app.otterware.dev/raw/session/grant'),
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

  it('serves static application assets only on the app host', () => {
    expect(
      isApplicationAsset(
        new Request('https://app.otterware.dev/assets/app.js'),
        env,
      ),
    ).toBe(true)
    expect(
      isApplicationAsset(
        new Request('https://app.otterware.dev/manifest.json'),
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

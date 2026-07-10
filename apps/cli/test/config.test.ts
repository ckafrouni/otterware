import { describe, expect, it } from 'vitest'
import { mergeProfile } from '../src/config'

describe('profile updates', () => {
  it('preserves credentials when selecting an organization', () => {
    expect(
      mergeProfile(
        {
          apiUrl: 'https://app.otterware.dev',
          accessToken: 'device-token',
        },
        { organizationId: 'organization-1' },
      ),
    ).toEqual({
      apiUrl: 'https://app.otterware.dev',
      accessToken: 'device-token',
      organizationId: 'organization-1',
    })
  })

  it('removes only credentials explicitly cleared', () => {
    expect(
      mergeProfile(
        {
          apiUrl: 'https://app.otterware.dev',
          accessToken: 'device-token',
          apiKey: 'api-key',
        },
        { accessToken: undefined },
      ),
    ).toEqual({
      apiUrl: 'https://app.otterware.dev',
      apiKey: 'api-key',
    })
  })
})

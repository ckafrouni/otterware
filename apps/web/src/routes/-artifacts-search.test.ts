import { describe, expect, it } from 'vitest'
import { artifactListSearchSchema } from './artifacts'

describe('artifact list URL state', () => {
  it('accepts shareable artifact controls', () => {
    expect(
      artifactListSearchSchema.parse({
        q: ' roadmap ',
        sort: 'az',
        status: 'archived',
        view: 'list',
      }),
    ).toEqual({
      q: ' roadmap ',
      sort: 'az',
      status: 'archived',
      view: 'list',
    })
  })

  it('drops invalid enumerated URL state', () => {
    expect(
      artifactListSearchSchema.parse({
        sort: 'oldest',
        status: 'deleted',
        view: 'table',
      }),
    ).toEqual({ sort: undefined, status: undefined, view: undefined })
  })
})

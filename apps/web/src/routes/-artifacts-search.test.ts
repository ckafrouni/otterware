import { describe, expect, it } from 'vitest'
import { artifactListSearchSchema } from './home'

describe('document list URL state', () => {
  it('accepts shareable document controls', () => {
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

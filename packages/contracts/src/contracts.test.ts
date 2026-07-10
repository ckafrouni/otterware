import { describe, expect, it } from 'vitest'
import { createArtifactInputSchema, updateArtifactInputSchema } from './index'

describe('artifact inputs', () => {
  it('normalizes create defaults', () => {
    const value = createArtifactInputSchema.parse({
      slug: 'hello-world',
      title: 'Hello world',
    })

    expect(value.visibility).toBe('private')
    expect(value.entryPath).toBe('index.html')
  })

  it('rejects unsafe slugs and empty updates', () => {
    expect(() =>
      createArtifactInputSchema.parse({ slug: '../admin', title: 'Bad' }),
    ).toThrow()
    expect(() => updateArtifactInputSchema.parse({})).toThrow()
  })
})

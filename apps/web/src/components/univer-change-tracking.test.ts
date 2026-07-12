import { describe, expect, it } from 'vitest'
import { changesSnapshot } from './univer-change-tracking'

describe('changesSnapshot', () => {
  it('ignores commands and UI-only operations such as cell selection', () => {
    expect(changesSnapshot({ type: 0 })).toBe(false)
    expect(changesSnapshot({ type: 1 })).toBe(false)
    expect(changesSnapshot({})).toBe(false)
  })

  it('tracks mutations persisted in the document snapshot', () => {
    expect(changesSnapshot({ type: 2 })).toBe(true)
  })
})

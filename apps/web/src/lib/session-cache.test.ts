// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  readSessionCache,
  removeSessionCachePrefix,
  writeSessionCache,
} from './session-cache'

describe('session cache', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.useRealTimers()
  })

  it('returns fresh values and expires stale values', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-11T20:00:00Z'))
    writeSessionCache('otterware:test', { value: 42 })
    expect(
      readSessionCache<{ value: number }>('otterware:test', 1_000)?.value,
    ).toEqual({ value: 42 })
    vi.setSystemTime(new Date('2026-07-11T20:00:02Z'))
    expect(readSessionCache('otterware:test', 1_000)).toBeUndefined()
  })

  it('removes only the requested cache namespace', () => {
    writeSessionCache('otterware:artifact:one', 1)
    writeSessionCache('otterware:artifact:two', 2)
    writeSessionCache('otterware:organizations:user', 3)
    removeSessionCachePrefix('otterware:artifact:')
    expect(sessionStorage.getItem('otterware:artifact:one')).toBeNull()
    expect(sessionStorage.getItem('otterware:artifact:two')).toBeNull()
    expect(
      sessionStorage.getItem('otterware:organizations:user'),
    ).not.toBeNull()
  })
})

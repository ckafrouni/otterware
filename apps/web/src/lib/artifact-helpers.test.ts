import { describe, expect, it } from 'vitest'
import {
  formatBytes,
  getArtifactFormat,
  isAgentActor,
  relativeTime,
} from './artifact-helpers'

describe('artifact-helpers', () => {
  describe('formatBytes', () => {
    it('formats bytes correctly', () => {
      expect(formatBytes(0)).toBe('0 B')
      expect(formatBytes(512)).toBe('512 B')
      expect(formatBytes(1024)).toBe('1.0 KB')
      expect(formatBytes(1536)).toBe('1.5 KB')
      expect(formatBytes(1048576)).toBe('1.0 MB')
      expect(formatBytes(2500000)).toBe('2.4 MB')
      expect(formatBytes(null)).toBe('0 B')
      expect(formatBytes(undefined)).toBe('0 B')
    })
  })

  describe('isAgentActor', () => {
    it('detects API key actors as agents', () => {
      expect(
        isAgentActor({ id: 'key-1', name: 'my-token', type: 'api_key' }),
      ).toBe(true)
    })

    it('detects agent naming patterns', () => {
      expect(
        isAgentActor({ id: 'u-1', name: 'Claude Agent', type: 'user' }),
      ).toBe(true)
      expect(isAgentActor({ id: 'u-2', name: 'Codex Bot', type: 'user' })).toBe(
        true,
      )
    })

    it('identifies human users correctly', () => {
      expect(
        isAgentActor({ id: 'u-3', name: 'Chris Kafrouni', type: 'user' }),
      ).toBe(false)
      expect(isAgentActor(null)).toBe(false)
      expect(isAgentActor(undefined)).toBe(false)
    })
  })

  describe('getArtifactFormat', () => {
    it('identifies html formats', () => {
      expect(getArtifactFormat('index.html').type).toBe('html')
      expect(getArtifactFormat('app.htm').badge).toBe('HTML')
    })

    it('identifies spreadsheet formats', () => {
      expect(getArtifactFormat('financials.xlsx').type).toBe('sheet')
      expect(getArtifactFormat('data.csv').badge).toBe('CSV')
    })

    it('identifies markdown doc formats', () => {
      expect(getArtifactFormat('README.md').type).toBe('doc')
      expect(getArtifactFormat('spec.markdown').badge).toBe('MD')
    })
  })

  describe('relativeTime', () => {
    it('returns reasonable relative timestamps', () => {
      const now = new Date().toISOString()
      expect(relativeTime(now)).toBe('just now')
      const fiveMinsAgo = new Date(Date.now() - 5 * 60_000).toISOString()
      expect(relativeTime(fiveMinsAgo)).toBe('5m ago')
    })
  })
})

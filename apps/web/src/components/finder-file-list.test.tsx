// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Artifact } from '@otterware/contracts'
import { FinderFileList } from './finder-file-list'

const mockArtifacts: Artifact[] = [
  {
    id: 'art-1',
    organizationId: 'org-1',
    ownerUserId: 'user-1',
    slug: 'financial-model',
    title: 'Financial Model',
    description: 'Q3 workbook',
    createdAt: '2026-09-01T12:00:00.000Z',
    updatedAt: '2026-09-18T10:00:00.000Z',
    archivedAt: null,
    versionCount: 2,
    url: 'https://usercontent.otterware.dev/art-1',
    thumbnailUrl: null,
    currentVersion: {
      id: 'ver-1',
      number: 1,
      label: 'Initial',
      entryPath: 'model.xlsx',
      createdAt: '2026-09-18T10:00:00.000Z',
      createdBy: { id: 'agent-1', name: 'Claude Agent', type: 'api_key' },
      fileCount: 1,
      byteSize: 2048,
      contentHash: 'hash1',
    },
  },
  {
    id: 'art-2',
    organizationId: 'org-1',
    ownerUserId: 'user-1',
    slug: 'executive-summary',
    title: 'Executive Summary',
    description: 'Q3 highlights',
    createdAt: '2026-09-02T12:00:00.000Z',
    updatedAt: '2026-09-17T10:00:00.000Z',
    archivedAt: null,
    versionCount: 1,
    url: 'https://usercontent.otterware.dev/art-2',
    thumbnailUrl: null,
    currentVersion: {
      id: 'ver-2',
      number: 1,
      label: 'Initial notes',
      entryPath: 'summary.md',
      createdAt: '2026-09-17T10:00:00.000Z',
      createdBy: { id: 'u-1', name: 'Chris', type: 'user' },
      fileCount: 1,
      byteSize: 1024,
      contentHash: 'hash2',
    },
  },
]

afterEach(cleanup)

describe('FinderFileList', () => {
  it('renders files with selection and status filters', () => {
    const onSelect = vi.fn()
    const onOpen = vi.fn()
    const onQuickLook = vi.fn()
    const onStatusChange = vi.fn()

    render(
      <FinderFileList
        artifacts={mockArtifacts}
        selectedArtifactId="art-1"
        onSelectArtifact={onSelect}
        onOpenArtifact={onOpen}
        onQuickLook={onQuickLook}
      />,
    )

    expect(screen.getByText('Financial Model')).not.toBeNull()
    expect(screen.getByText('Executive Summary')).not.toBeNull()
    expect(screen.getByText('2 items')).not.toBeNull()
  })

  it('selects item on click and triggers open on double click', () => {
    const onSelect = vi.fn()
    const onOpen = vi.fn()

    render(
      <FinderFileList
        artifacts={mockArtifacts}
        selectedArtifactId="art-1"
        onSelectArtifact={onSelect}
        onOpenArtifact={onOpen}
        onQuickLook={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByText('Executive Summary'))
    expect(onSelect).toHaveBeenCalledWith(mockArtifacts[1])

    fireEvent.doubleClick(screen.getByText('Executive Summary'))
    expect(onOpen).toHaveBeenCalledWith(mockArtifacts[1])
  })
})

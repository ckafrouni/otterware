// @vitest-environment jsdom

import * as React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Artifact } from '@otterware/contracts'
import { FinderColumnView } from './finder-column-view'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    ...props
  }: React.PropsWithChildren<Record<string, unknown>>) => (
    <a href="/preview" {...props}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
}))

const mockArtifacts: Artifact[] = [
  {
    id: 'art-1',
    organizationId: 'org-1',
    ownerUserId: 'user-1',
    slug: 'financial-model',
    title: 'Financial Model',
    description: 'Q3 financial model workbook',
    createdAt: '2026-09-01T12:00:00.000Z',
    updatedAt: '2026-09-18T10:00:00.000Z',
    archivedAt: null,
    versionCount: 2,
    url: 'https://usercontent.otterware.dev/art-1',
    thumbnailUrl: null,
    currentVersion: {
      id: 'ver-1',
      number: 1,
      label: 'Initial version',
      entryPath: 'model.xlsx',
      createdAt: '2026-09-18T10:00:00.000Z',
      createdBy: {
        id: 'agent-1',
        name: 'Claude Agent',
        type: 'api_key',
      },
      fileCount: 1,
      byteSize: 2048,
      contentHash: 'hash1',
    },
  },
  {
    id: 'art-2',
    organizationId: 'org-1',
    ownerUserId: 'user-1',
    slug: 'project-notes',
    title: 'Project Notes',
    description: 'Weekly team notes and goals',
    createdAt: '2026-09-02T12:00:00.000Z',
    updatedAt: '2026-09-17T10:00:00.000Z',
    archivedAt: null,
    versionCount: 1,
    url: 'https://usercontent.otterware.dev/art-2',
    thumbnailUrl: null,
    currentVersion: {
      id: 'ver-2',
      number: 1,
      label: 'Draft notes',
      entryPath: 'notes.md',
      createdAt: '2026-09-17T10:00:00.000Z',
      createdBy: {
        id: 'user-1',
        name: 'Chris',
        type: 'user',
      },
      fileCount: 1,
      byteSize: 1024,
      contentHash: 'hash2',
    },
  },
]

afterEach(cleanup)

describe('FinderColumnView', () => {
  it('renders all three columns: Navigation, Artifacts, and Inspector', () => {
    const onSelect = vi.fn()
    const onQuickLook = vi.fn()
    const onShare = vi.fn()

    render(
      <FinderColumnView
        artifacts={mockArtifacts}
        organizationSlug="zentio"
        selectedArtifactId="art-1"
        onSelectArtifact={onSelect}
        onQuickLook={onQuickLook}
        onShare={onShare}
      />,
    )

    // Navigation column
    expect(screen.getByText('Navigation')).not.toBeNull()
    expect(screen.getByText('All Artifacts')).not.toBeNull()
    expect(screen.getByText('AI Generated')).not.toBeNull()
    expect(screen.getByText('Human Edited')).not.toBeNull()

    // Artifacts column
    expect(screen.getAllByText('Financial Model').length).toBeGreaterThan(0)
    expect(screen.getByText('Project Notes')).not.toBeNull()

    // Inspector column
    expect(screen.getByText('Inspector')).not.toBeNull()
    expect(screen.getByText('Claude Agent')).not.toBeNull()
    expect(screen.getByText('AI Agent')).not.toBeNull()
    expect(screen.getByText('Open Full Artifact')).not.toBeNull()
  })

  it('calls onSelectArtifact when an item in the list is clicked', () => {
    const onSelect = vi.fn()
    const onQuickLook = vi.fn()
    const onShare = vi.fn()

    render(
      <FinderColumnView
        artifacts={mockArtifacts}
        organizationSlug="zentio"
        selectedArtifactId="art-1"
        onSelectArtifact={onSelect}
        onQuickLook={onQuickLook}
        onShare={onShare}
      />,
    )

    fireEvent.click(screen.getByText('Project Notes'))
    expect(onSelect).toHaveBeenCalledWith(mockArtifacts[1])
  })

  it('triggers onQuickLook and onShare actions from inspector', () => {
    const onSelect = vi.fn()
    const onQuickLook = vi.fn()
    const onShare = vi.fn()

    render(
      <FinderColumnView
        artifacts={mockArtifacts}
        organizationSlug="zentio"
        selectedArtifactId="art-1"
        onSelectArtifact={onSelect}
        onQuickLook={onQuickLook}
        onShare={onShare}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Quick Look/i }))
    expect(onQuickLook).toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /Share/i }))
    expect(onShare).toHaveBeenCalled()
  })
})

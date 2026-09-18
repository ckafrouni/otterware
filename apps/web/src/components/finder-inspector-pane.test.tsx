// @vitest-environment jsdom

import * as React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Artifact } from '@otterware/contracts'
import { FinderInspectorPane } from './finder-inspector-pane'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    ...props
  }: React.PropsWithChildren<Record<string, unknown>>) => (
    <a href="/preview" {...props}>
      {children}
    </a>
  ),
}))

const mockArtifact: Artifact = {
  id: 'art-1',
  organizationId: 'org-1',
  ownerUserId: 'user-1',
  slug: 'quarterly-report',
  title: 'Quarterly Financial Report',
  description: 'AI generated balance sheet and income statement',
  createdAt: '2026-09-01T12:00:00.000Z',
  updatedAt: '2026-09-18T10:00:00.000Z',
  archivedAt: null,
  versionCount: 3,
  url: 'https://usercontent.otterware.dev/art-1',
  thumbnailUrl: null,
  currentVersion: {
    id: 'ver-3',
    number: 3,
    label: 'Calculated margins',
    entryPath: 'model.xlsx',
    createdAt: '2026-09-18T10:00:00.000Z',
    createdBy: {
      id: 'agent-1',
      name: 'Claude Agent',
      type: 'api_key',
    },
    fileCount: 1,
    byteSize: 1048576,
    contentHash: 'a1b2c3d4e5f6',
  },
}

afterEach(cleanup)

describe('FinderInspectorPane', () => {
  it('renders large document preview and file details', () => {
    const onQuickLook = vi.fn()
    const onShare = vi.fn()

    render(
      <FinderInspectorPane
        artifact={mockArtifact}
        organizationSlug="zentio"
        onQuickLook={onQuickLook}
        onShare={onShare}
      />,
    )

    expect(screen.getByText('Information')).not.toBeNull()
    expect(screen.getByText('Claude Agent')).not.toBeNull()
    expect(screen.getByText(/1\.0 MB/)).not.toBeNull()
    expect(screen.getByText('model.xlsx')).not.toBeNull()
    expect(screen.getByText('Open Full Artifact')).not.toBeNull()
    expect(screen.getByText('Collaborate with AI Agent')).not.toBeNull()
  })

  it('triggers onQuickLook when preview stage is clicked', () => {
    const onQuickLook = vi.fn()
    const onShare = vi.fn()

    render(
      <FinderInspectorPane
        artifact={mockArtifact}
        organizationSlug="zentio"
        onQuickLook={onQuickLook}
        onShare={onShare}
      />,
    )

    fireEvent.click(screen.getByTitle(/Click or press Spacebar to Quick Look/i))
    expect(onQuickLook).toHaveBeenCalledWith(mockArtifact)
  })

  it('renders empty message when no artifact is provided', () => {
    render(
      <FinderInspectorPane
        artifact={null}
        organizationSlug="zentio"
        onQuickLook={vi.fn()}
        onShare={vi.fn()}
      />,
    )

    expect(
      screen.getByText('Select an item to see its preview and details.'),
    ).not.toBeNull()
  })
})

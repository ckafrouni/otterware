// @vitest-environment jsdom

import * as React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Artifact } from '@otterware/contracts'
import { QuickLookDialog } from './quick-look-dialog'

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
  description: 'AI generated financial analysis',
  createdAt: '2026-09-01T12:00:00.000Z',
  updatedAt: '2026-09-18T10:00:00.000Z',
  archivedAt: null,
  versionCount: 2,
  url: 'https://usercontent.otterware.dev/art-1',
  thumbnailUrl: null,
  currentVersion: {
    id: 'ver-2',
    number: 2,
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

describe('QuickLookDialog', () => {
  it('renders artifact details and AI Agent attribution badge', () => {
    const onOpenChange = vi.fn()
    render(
      <QuickLookDialog
        open={true}
        onOpenChange={onOpenChange}
        artifact={mockArtifact}
        organizationSlug="zentio"
      />,
    )

    expect(
      screen.getAllByText('Quarterly Financial Report').length,
    ).toBeGreaterThan(0)
    expect(screen.getByText('v2')).not.toBeNull()
    expect(screen.getByText('XLSX')).not.toBeNull()
    expect(screen.getByText('Claude Agent')).not.toBeNull()
    expect(screen.getByText('AI Agent')).not.toBeNull()
    expect(screen.getByText('1.0 MB')).not.toBeNull()
  })

  it('closes on Spacebar and Escape key presses', () => {
    const onOpenChange = vi.fn()
    render(
      <QuickLookDialog
        open={true}
        onOpenChange={onOpenChange}
        artifact={mockArtifact}
        organizationSlug="zentio"
      />,
    )

    fireEvent.keyDown(window, { key: ' ' })
    expect(onOpenChange).toHaveBeenCalledWith(false)

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})

// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import type React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WorkspaceArtifactRoute } from './workspace-artifact-route'

const { useOrganizations } = vi.hoisted(() => ({
  useOrganizations: vi.fn(),
}))

vi.mock('@/hooks/use-organizations', () => ({ useOrganizations }))
vi.mock('./auth-gate', () => ({
  AuthGate: ({ children }: { children: React.ReactNode }) => children,
}))
vi.mock('./artifact-viewer', () => ({
  ArtifactViewer: ({
    organizationId,
    organizationSlug,
  }: {
    organizationId: string
    organizationSlug: string
  }) => (
    <div>
      Viewer for {organizationSlug} ({organizationId})
    </div>
  ),
}))

describe('WorkspaceArtifactRoute', () => {
  afterEach(cleanup)

  beforeEach(() => {
    useOrganizations.mockReset()
  })

  it('scopes the viewer to the organization encoded in the URL', () => {
    useOrganizations.mockReturnValue({
      activeOrganization: { id: 'org-chris', name: 'Chris', slug: 'chris' },
      loaded: true,
      organizations: [
        { id: 'org-chris', name: 'Chris', slug: 'chris' },
        { id: 'org-zentio', name: 'Zentio', slug: 'zentio' },
      ],
    })

    render(<WorkspaceArtifactRoute organizationSlug="zentio" slug="contract" />)

    expect(screen.getByText('Viewer for zentio (org-zentio)')).not.toBeNull()
  })

  it('renders immediately when the URL team is already active', () => {
    useOrganizations.mockReturnValue({
      activeOrganization: { id: 'org-zentio', name: 'Zentio', slug: 'zentio' },
      loaded: true,
      organizations: [{ id: 'org-zentio', name: 'Zentio', slug: 'zentio' }],
    })

    render(<WorkspaceArtifactRoute organizationSlug="zentio" slug="contract" />)

    expect(screen.getByText('Viewer for zentio (org-zentio)')).not.toBeNull()
  })
})

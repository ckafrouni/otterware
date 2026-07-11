// @vitest-environment jsdom

import { render, screen, waitFor } from '@testing-library/react'
import type React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { WorkspaceArtifactRoute } from './workspace-artifact-route'

const { selectOrganization, useOrganizations } = vi.hoisted(() => ({
  selectOrganization: vi.fn(),
  useOrganizations: vi.fn(),
}))

vi.mock('@/hooks/use-organizations', () => ({ useOrganizations }))
vi.mock('./auth-gate', () => ({
  AuthGate: ({ children }: { children: React.ReactNode }) => children,
}))
vi.mock('./artifact-viewer', () => ({
  ArtifactViewer: ({ organizationSlug }: { organizationSlug: string }) => (
    <div>Viewer for {organizationSlug}</div>
  ),
}))

describe('WorkspaceArtifactRoute', () => {
  beforeEach(() => {
    selectOrganization.mockReset().mockResolvedValue(undefined)
    useOrganizations.mockReset()
  })

  it('selects the organization encoded in the URL before rendering', async () => {
    useOrganizations.mockReturnValue({
      activeOrganization: { id: 'org-chris', name: 'Chris', slug: 'chris' },
      loaded: true,
      organizations: [
        { id: 'org-chris', name: 'Chris', slug: 'chris' },
        { id: 'org-zentio', name: 'Zentio', slug: 'zentio' },
      ],
      selectOrganization,
    })

    render(<WorkspaceArtifactRoute organizationSlug="zentio" slug="contract" />)

    expect(screen.getByText('Switching to zentio…')).not.toBeNull()
    await waitFor(() =>
      expect(selectOrganization).toHaveBeenCalledWith('org-zentio'),
    )
    expect(screen.queryByText('Viewer for zentio')).toBeNull()
  })

  it('renders immediately when the URL team is already active', () => {
    useOrganizations.mockReturnValue({
      activeOrganization: { id: 'org-zentio', name: 'Zentio', slug: 'zentio' },
      loaded: true,
      organizations: [{ id: 'org-zentio', name: 'Zentio', slug: 'zentio' }],
      selectOrganization,
    })

    render(<WorkspaceArtifactRoute organizationSlug="zentio" slug="contract" />)

    expect(screen.getByText('Viewer for zentio')).not.toBeNull()
    expect(selectOrganization).not.toHaveBeenCalled()
  })
})

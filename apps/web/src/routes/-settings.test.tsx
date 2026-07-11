// @vitest-environment jsdom

import * as React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SettingsPage } from './settings'

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => () => ({}),
}))

vi.mock('#/components/app-header', () => ({ AppHeader: () => null }))
vi.mock('#/components/auth-gate', () => ({
  AuthGate: ({ children }: { children: React.ReactNode }) => children,
}))
vi.mock('@/hooks/use-current-actor', () => ({
  useCurrentActor: () => ({ roles: ['owner'] }),
}))
vi.mock('#/lib/auth-client', () => ({
  authClient: {
    useSession: () => ({
      data: { session: { activeOrganizationId: 'org-zentio' } },
      refetch: vi.fn(),
    }),
    organization: {
      list: vi.fn().mockResolvedValue({
        data: [
          { id: 'org-chris', name: 'chris', slug: 'chris' },
          { id: 'org-zentio', name: 'Zentio', slug: 'zentio' },
        ],
      }),
      create: vi.fn(),
      setActive: vi.fn(),
      update: vi.fn(),
      inviteMember: vi.fn(),
    },
    apiKey: { create: vi.fn() },
  },
}))

describe('SettingsPage', () => {
  it('shows the active organization name instead of its database id', async () => {
    render(<SettingsPage />)

    const teamSelect = await screen.findByRole('combobox', {
      name: 'Active team',
    })
    await waitFor(() => expect(teamSelect.textContent).toContain('Zentio'))
    expect(teamSelect.textContent).not.toContain('org-zentio')
  })
})

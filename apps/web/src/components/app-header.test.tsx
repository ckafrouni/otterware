// @vitest-environment jsdom

import * as React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AppHeader } from './app-header'

vi.mock('@tanstack/react-router', () => ({
  Link: React.forwardRef<
    HTMLAnchorElement,
    React.AnchorHTMLAttributes<HTMLAnchorElement> & {
      to: string
      activeProps?: React.AnchorHTMLAttributes<HTMLAnchorElement>
    }
  >(function MockLink({ to, activeProps: _activeProps, ...props }, ref) {
    return <a ref={ref} href={to} {...props} />
  }),
}))

vi.mock('#/lib/auth-client', () => ({
  authClient: {
    useSession: () => ({
      data: {
        user: { name: 'Chris Kafrouni', email: 'chris@example.com' },
      },
    }),
    signOut: vi.fn(),
  },
}))

vi.mock('@/hooks/use-organizations', () => ({
  useOrganizations: () => ({
    activeOrganization: { id: 'org-1', name: 'Otterware', slug: 'otterware' },
    organizations: [{ id: 'org-1', name: 'Otterware', slug: 'otterware' }],
    selectOrganization: vi.fn(),
  }),
}))

describe('AppHeader', () => {
  it('opens the compact user menu with account actions', async () => {
    render(<AppHeader />)

    fireEvent.click(screen.getByRole('button', { name: /Chris Kafrouni/i }))

    expect(
      await screen.findByRole('menuitem', { name: 'Settings' }),
    ).not.toBeNull()
    expect(screen.getByText('Theme')).not.toBeNull()
    expect(screen.getByRole('menuitem', { name: 'Sign out' })).not.toBeNull()
  })
})

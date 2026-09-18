// @vitest-environment jsdom

import * as React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
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
  useLocation: ({
    select,
  }: {
    select?: (location: { pathname: string }) => unknown
  } = {}) => {
    const location = { pathname: '/artifacts' }
    return select ? select(location) : location
  },
  useNavigate: () => vi.fn(),
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

afterEach(cleanup)

describe('AppHeader', () => {
  it('renders brand badge, active space switcher, and page title', () => {
    const { container } = render(<AppHeader />)

    expect(
      container.querySelector('.app-header .app-breadcrumb strong')
        ?.textContent,
    ).toBe('Artifacts')
    expect(screen.getAllByText('Otterware').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole('button', { name: /Switch space/i })).not.toBeNull()
  })

  it('provides quick search command trigger and user account menu', () => {
    render(<AppHeader />)

    expect(
      screen.getByRole('button', { name: /Search artifacts/i }),
    ).not.toBeNull()
    expect(screen.getByText('⌘K')).not.toBeNull()
    expect(screen.getByRole('button', { name: /Account menu/i })).not.toBeNull()
  })
})

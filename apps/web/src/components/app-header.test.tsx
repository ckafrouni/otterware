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
  it('keeps the page title centered without duplicating the team in the header', () => {
    const { container } = render(<AppHeader />)

    expect(container.querySelector('.app-header > strong')?.textContent).toBe(
      'Artifacts',
    )
    expect(container.querySelector('.header-context')).toBeNull()
  })

  it('unpacks teams, theme, settings and account into the sidebar', () => {
    const { container } = render(<AppHeader />)
    const sidebar = container.querySelector('.app-sidebar')!

    expect(sidebar.querySelector('.sidebar-teams')?.textContent).toContain(
      'Teams',
    )
    expect(
      screen
        .getByRole('button', { name: /Otterware/ })
        .getAttribute('aria-current'),
    ).toBe('true')
    expect(screen.getByRole('link', { name: 'Settings' })).not.toBeNull()
    expect(
      screen
        .getByRole('button', { name: 'Dark theme' })
        .getAttribute('aria-pressed'),
    ).toBe('false')
    expect(sidebar.querySelector('.sidebar-account')?.textContent).toContain(
      'chris@example.com',
    )
    expect(screen.getByRole('button', { name: 'Sign out' })).not.toBeNull()
  })
})

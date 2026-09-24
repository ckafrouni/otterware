// @vitest-environment jsdom

import * as React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
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
    const location = { pathname: '/home' }
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
    activeOrganization: { id: 'org-1', name: 'OtterDrive', slug: 'otterware' },
    organizations: [{ id: 'org-1', name: 'OtterDrive', slug: 'otterware' }],
    selectOrganization: vi.fn(),
  }),
}))

afterEach(cleanup)

describe('AppHeader', () => {
  it('keeps the page title centered without duplicating the team in the header', () => {
    const { container } = render(<AppHeader />)

    expect(
      container.querySelector('.app-header .app-breadcrumb strong')
        ?.textContent,
    ).toBe('Documents')
    expect(container.querySelector('.header-context')).toBeNull()
  })

  it('opens the Documents account menu link at /home', async () => {
    const { container } = render(<AppHeader />)
    fireEvent.click(container.querySelector('.sidebar-account')!)
    const link = await screen.findByRole('menuitem', { name: 'Documents' })
    expect(link.getAttribute('href')).toBe('/home')
    expect(screen.queryByRole('menuitem', { name: 'Artifacts' })).toBeNull()
  })

  it('puts search above the teams and folds the account into one row', () => {
    const { container } = render(<AppHeader />)
    const sidebar = container.querySelector('.app-sidebar')!
    const search = sidebar.querySelector('.sidebar-search')!
    const teams = sidebar.querySelector('.sidebar-teams')!

    expect(search.textContent).toContain('Search')
    expect(
      search.compareDocumentPosition(teams) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(teams.textContent).toContain('Teams')
    expect(
      screen
        .getByRole('button', { name: /OtterDrive/ })
        .getAttribute('aria-current'),
    ).toBe('true')
    expect(sidebar.querySelector('.sidebar-account')?.textContent).toContain(
      'chris@example.com',
    )
    expect(sidebar.querySelector('.sidebar-theme')).toBeNull()
    expect(sidebar.querySelector('.sidebar-account')?.tagName).toBe('BUTTON')
  })
})

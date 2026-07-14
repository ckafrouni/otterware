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

  it('merges teams and account actions into the workspace menu', async () => {
    render(<AppHeader />)

    fireEvent.click(
      screen.getByRole('button', { name: /Select team|Otterware/ }),
    )

    expect(await screen.findByText('Chris Kafrouni')).not.toBeNull()
    expect(screen.getByText('chris@example.com')).not.toBeNull()
    expect(screen.getByText('Teams')).not.toBeNull()
    expect(screen.getByRole('menuitem', { name: /Otterware/ })).not.toBeNull()
    expect(screen.getByRole('menuitem', { name: 'Settings' })).not.toBeNull()
    expect(screen.getByText('Theme')).not.toBeNull()
    expect(screen.getByRole('menuitem', { name: 'Sign out' })).not.toBeNull()
  })
})

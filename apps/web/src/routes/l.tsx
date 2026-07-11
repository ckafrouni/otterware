import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/l')({
  beforeLoad: () => {
    throw redirect({ to: '/artifacts', search: { view: 'list' } })
  },
})

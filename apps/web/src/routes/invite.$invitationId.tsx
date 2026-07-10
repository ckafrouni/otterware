import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { authClient } from '#/lib/auth-client'
import { AuthGate } from '#/components/auth-gate'

export const Route = createFileRoute('/invite/$invitationId')({
  component: InvitePage,
})

function InvitePage() {
  const { invitationId } = Route.useParams()
  const [status, setStatus] = useState('Accepting invitation…')
  useEffect(() => {
    authClient.organization
      .acceptInvitation({ invitationId })
      .then((result) => {
        if (result.error)
          setStatus(result.error.message ?? 'Could not accept invitation.')
        else {
          setStatus('Invitation accepted. Redirecting…')
          setTimeout(() => location.assign('/artifacts'), 700)
        }
      })
  }, [invitationId])
  return (
    <AuthGate>
      <main className="centered-state">
        <h1>Otterware invitation</h1>
        <p>{status}</p>
      </main>
    </AuthGate>
  )
}

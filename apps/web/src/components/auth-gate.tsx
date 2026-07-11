import { useEffect } from 'react'
import { authClient } from '#/lib/auth-client'

export function AuthGate({
  children,
  fallback,
}: {
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  const session = authClient.useSession()

  useEffect(() => {
    if (!session.isPending && !session.data) {
      const callback = `${location.pathname}${location.search}`
      location.assign(`/login?callback=${encodeURIComponent(callback)}`)
    }
  }, [session.data, session.isPending])

  if (session.isPending || !session.data) {
    if (fallback) return fallback
    return (
      <main className="centered-state">
        <div className="spinner" />
        <p>Loading Otterware…</p>
      </main>
    )
  }
  return children
}

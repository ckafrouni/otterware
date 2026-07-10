import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { authClient } from '#/lib/auth-client'

const searchSchema = z.object({
  user_code: z.string().optional(),
})

export const Route = createFileRoute('/device')({
  validateSearch: searchSchema,
  component: DevicePage,
})

function DevicePage() {
  const search = Route.useSearch()
  const session = authClient.useSession()
  const [code, setCode] = useState(search.user_code ?? '')
  const [status, setStatus] = useState<
    'idle' | 'ready' | 'approved' | 'denied'
  >('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!session.isPending && !session.data) {
      location.assign(
        `/login?callback=${encodeURIComponent(location.pathname + location.search)}`,
      )
    }
  }, [session.data, session.isPending])

  useEffect(() => {
    if (!session.data || !code) return
    authClient.device({ query: { user_code: code } }).then((result) => {
      if (result.error)
        setError(result.error.error_description ?? 'Invalid device code.')
      else setStatus('ready')
    })
  }, [code, session.data])

  async function decide(approve: boolean) {
    setError(null)
    const result = approve
      ? await authClient.device.approve({ userCode: code })
      : await authClient.device.deny({ userCode: code })
    if (result.error)
      setError(
        result.error.error_description ?? 'Could not authorize the device.',
      )
    else setStatus(approve ? 'approved' : 'denied')
  }

  return (
    <main className="auth-page">
      <section className="auth-card device-card">
        <p className="eyebrow">CLI authorization</p>
        <h1>Connect a device</h1>
        {status === 'approved' || status === 'denied' ? (
          <div className="decision-result">
            <strong>
              {status === 'approved' ? 'Device connected' : 'Request denied'}
            </strong>
            <p>You can close this tab and return to your terminal.</p>
          </div>
        ) : (
          <>
            <label className="device-code-label">
              Authorization code
              <input
                value={code}
                onChange={(event) => {
                  setCode(event.target.value.toUpperCase())
                  setStatus('idle')
                }}
              />
            </label>
            {error && <p className="form-error">{error}</p>}
            <p className="security-note">
              Only approve devices or agents you recognize. They will act as
              your Otterware identity.
            </p>
            <div className="decision-actions">
              <button
                className="secondary-button"
                type="button"
                disabled={status !== 'ready'}
                onClick={() => void decide(false)}
              >
                Deny
              </button>
              <button
                className="primary-button"
                type="button"
                disabled={status !== 'ready'}
                onClick={() => void decide(true)}
              >
                Approve device
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  )
}

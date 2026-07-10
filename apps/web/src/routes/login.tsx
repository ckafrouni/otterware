import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Box } from 'lucide-react'
import { z } from 'zod'
import { api } from '#/lib/api'
import { authClient } from '#/lib/auth-client'

const searchSchema = z.object({
  callback: z.string().optional(),
})

export const Route = createFileRoute('/login')({
  validateSearch: searchSchema,
  component: LoginPage,
})

function safeCallback(value?: string): string {
  return value?.startsWith('/') && !value.startsWith('//')
    ? value
    : '/artifacts'
}

interface AuthConfig {
  googleEnabled: boolean
  passwordEnabled: boolean
  bootstrapRequired: boolean
  adminEmail: string
}

function LoginPage() {
  const { callback } = Route.useSearch()
  const destination = safeCallback(callback)
  const invitationSignup = destination.startsWith('/invite/')
  const session = authClient.useSession()
  const [config, setConfig] = useState<AuthConfig | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (session.data) location.assign(destination)
  }, [destination, session.data])

  useEffect(() => {
    api<{ data: AuthConfig }>('/api/v1/auth-config')
      .then(({ data }) => {
        setConfig(data)
        if (data.bootstrapRequired) {
          setName('Chris Kafrouni')
          setEmail(data.adminEmail)
        }
      })
      .catch((cause: unknown) =>
        setError(
          cause instanceof Error ? cause.message : 'Could not load login.',
        ),
      )
  }, [])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    const signingUp = config?.bootstrapRequired || invitationSignup
    const callbackURL = config?.bootstrapRequired ? '/settings' : destination
    const result = signingUp
      ? await authClient.signUp.email({ name, email, password, callbackURL })
      : await authClient.signIn.email({ email, password, callbackURL })
    if (result.error) setError(result.error.message ?? 'Authentication failed.')
    else location.assign(callbackURL)
  }

  const signingUp = config?.bootstrapRequired || invitationSignup
  const heading = config?.bootstrapRequired
    ? 'Set up administrator'
    : invitationSignup
      ? 'Accept your invitation'
      : 'Welcome back'

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <Box size={19} /> Otterware
        </div>
        <div>
          <p className="eyebrow">Private collaboration</p>
          <h1>{heading}</h1>
          <p>
            {config?.bootstrapRequired
              ? 'Create the initial account for this private deployment.'
              : 'Access is invitation-only. Use the account your administrator invited.'}
          </p>
        </div>
        {config?.googleEnabled && (
          <button
            className="google-button"
            type="button"
            onClick={() =>
              void authClient.signIn.social({
                provider: 'google',
                callbackURL: config.bootstrapRequired
                  ? '/settings'
                  : destination,
              })
            }
          >
            Continue with Google
          </button>
        )}
        {config?.passwordEnabled && (
          <>
            {config.googleEnabled && (
              <div className="auth-divider">
                <span>or</span>
              </div>
            )}
            <form className="auth-form" onSubmit={submit}>
              {signingUp && (
                <label>
                  Name
                  <input
                    required
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </label>
              )}
              <label>
                Email
                <input
                  required
                  readOnly={config.bootstrapRequired}
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
              <label>
                Password
                <input
                  required
                  minLength={8}
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
              {error && <p className="form-error">{error}</p>}
              <button className="primary-button wide" type="submit">
                {signingUp ? 'Create account' : 'Sign in'}
              </button>
            </form>
          </>
        )}
        {!config && !error && (
          <div className="centered-state compact">
            <div className="spinner" />
          </div>
        )}
        {error && !config && <p className="form-error">{error}</p>}
      </section>
    </main>
  )
}

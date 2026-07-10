import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Box } from 'lucide-react'
import { z } from 'zod'
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

function LoginPage() {
  const { callback } = Route.useSearch()
  const destination = safeCallback(callback)
  const session = authClient.useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (session.data) location.assign(destination)
  }, [destination, session.data])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    const result = await authClient.signIn.email({
      email,
      password,
      callbackURL: destination,
    })
    if (result.error) setError(result.error.message ?? 'Authentication failed.')
    else location.assign(destination)
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <Box size={19} /> Otterware
        </div>
        <div>
          <p className="eyebrow">Private collaboration</p>
          <h1>Welcome back</h1>
          <p>
            Access is invitation-only. Continue with the Google account that was
            invited by your administrator.
          </p>
        </div>
        <button
          className="google-button"
          type="button"
          onClick={() =>
            void authClient.signIn.social({
              provider: 'google',
              callbackURL: destination,
            })
          }
        >
          Continue with Google
        </button>
        {import.meta.env.DEV && (
          <>
            <div className="auth-divider">
              <span>local development</span>
            </div>
            <form className="auth-form" onSubmit={submit}>
              <label>
                Email
                <input
                  required
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
                Sign in locally
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  )
}

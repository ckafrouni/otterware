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
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (session.data) location.assign(destination)
  }, [destination, session.data])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    const result =
      mode === 'signup'
        ? await authClient.signUp.email({
            name,
            email,
            password,
            callbackURL: destination,
          })
        : await authClient.signIn.email({
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
          <h1>{mode === 'signin' ? 'Welcome back' : 'Create your account'}</h1>
          <p>
            Publish immutable artifacts and collaborate safely with people and
            agents.
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
        <div className="auth-divider">
          <span>or</span>
        </div>
        <form className="auth-form" onSubmit={submit}>
          {mode === 'signup' && (
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
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>
        <button
          className="link-button"
          type="button"
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
        >
          {mode === 'signin'
            ? 'Need an account? Sign up'
            : 'Already have an account? Sign in'}
        </button>
      </section>
    </main>
  )
}

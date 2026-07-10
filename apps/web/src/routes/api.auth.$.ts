import { env } from 'cloudflare:workers'
import { createFileRoute } from '@tanstack/react-router'
import { createAuth } from '#/server/auth'

async function handler({ request }: { request: Request }) {
  return createAuth(env).handler(request)
}

export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: handler,
      POST: handler,
      PUT: handler,
      PATCH: handler,
      DELETE: handler,
    },
  },
})

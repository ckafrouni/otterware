import { env } from 'cloudflare:workers'
import { createFileRoute } from '@tanstack/react-router'
import { startContentSession } from '#/server/content'
import { errorResponse } from '#/server/http'

export const Route = createFileRoute('/raw/session/$token')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          return await startContentSession(request, env, params.token)
        } catch (error) {
          return errorResponse(error)
        }
      },
    },
  },
})

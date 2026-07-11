import { env } from 'cloudflare:workers'
import { createFileRoute } from '@tanstack/react-router'
import { serveThumbnail } from '#/server/content'
import { errorResponse } from '#/server/http'

export const Route = createFileRoute('/raw/thumbnail/$token')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          return await serveThumbnail(request, env, params.token)
        } catch (error) {
          return errorResponse(error)
        }
      },
    },
  },
})

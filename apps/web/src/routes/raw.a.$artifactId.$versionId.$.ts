import { env } from 'cloudflare:workers'
import { createFileRoute } from '@tanstack/react-router'
import { serveRawContent } from '#/server/content'
import { errorResponse } from '#/server/http'

export const Route = createFileRoute('/raw/a/$artifactId/$versionId/$')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          return await serveRawContent(
            request,
            env,
            params.artifactId,
            params.versionId,
            params._splat ?? '',
          )
        } catch (error) {
          return errorResponse(error)
        }
      },
    },
  },
})

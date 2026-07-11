import { env } from 'cloudflare:workers'
import { createFileRoute } from '@tanstack/react-router'
import { authenticate } from '#/server/actor'
import {
  archiveArtifact,
  bootstrapArtifact,
  completeUpload,
  completeMultipartFile,
  createArtifact,
  createUpload,
  deleteDraft,
  downloadArtifact,
  listArtifacts,
  listFiles,
  listVersions,
  permanentlyDeleteArtifact,
  previewArtifact,
  promoteVersion,
  regenerateThumbnail,
  readContent,
  showArtifact,
  updateArtifact,
  uploadFile,
} from '#/server/artifacts'
import { createAuth } from '#/server/auth'
import { errorResponse, HttpError, json } from '#/server/http'

async function handler({ request }: { request: Request }): Promise<Response> {
  try {
    const url = new URL(request.url)
    const segments = url.pathname
      .slice('/api/v1/'.length)
      .split('/')
      .filter(Boolean)
      .map(decodeURIComponent)

    if (segments[0] === 'auth-config' && request.method === 'GET') {
      const googleEnabled = Boolean(
        env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET,
      )
      return json({
        data: {
          googleEnabled,
          passwordEnabled: !googleEnabled,
        },
      })
    }

    const auth = createAuth(env)
    const actor = await authenticate(request, env, auth)

    if (segments[0] === 'me' && request.method === 'GET') {
      return json({
        data: {
          actor: {
            id: actor.id,
            type: actor.type,
            name: actor.name,
          },
          userId: actor.userId,
          organizationId: actor.organizationId,
          roles: actor.roles,
          permissions: actor.permissions,
        },
      })
    }

    if (segments[0] === 'artifacts') {
      const reference = segments[1]
      if (!reference) {
        if (request.method === 'GET') return listArtifacts(request, env, actor)
        if (request.method === 'POST')
          return createArtifact(request, env, actor)
      } else if (!segments[2]) {
        if (request.method === 'GET') return showArtifact(env, actor, reference)
        if (request.method === 'PATCH') {
          return updateArtifact(request, env, actor, reference)
        }
        if (request.method === 'DELETE') {
          return archiveArtifact(env, actor, reference)
        }
      } else if (segments[2] === 'draft' && request.method === 'DELETE') {
        return deleteDraft(env, actor, reference)
      } else if (segments[2] === 'restore' && request.method === 'POST') {
        return archiveArtifact(env, actor, reference, true)
      } else if (segments[2] === 'permanent' && request.method === 'DELETE') {
        return permanentlyDeleteArtifact(env, actor, reference)
      } else if (segments[2] === 'versions' && request.method === 'GET') {
        return listVersions(env, actor, reference)
      } else if (segments[2] === 'files' && request.method === 'GET') {
        return listFiles(request, env, actor, reference)
      } else if (segments[2] === 'content' && request.method === 'GET') {
        return readContent(request, env, actor, reference)
      } else if (segments[2] === 'download' && request.method === 'GET') {
        return downloadArtifact(request, env, actor, reference)
      } else if (segments[2] === 'preview' && request.method === 'GET') {
        return previewArtifact(request, env, actor, reference)
      } else if (segments[2] === 'bootstrap' && request.method === 'GET') {
        return bootstrapArtifact(request, env, actor, reference)
      } else if (segments[2] === 'thumbnail' && request.method === 'POST') {
        return regenerateThumbnail(request, env, actor, reference)
      } else if (segments[2] === 'uploads' && request.method === 'POST') {
        return createUpload(request, env, actor, reference)
      } else if (segments[2] === 'promote' && request.method === 'POST') {
        return promoteVersion(request, env, actor, reference)
      }
    }

    if (segments[0] === 'uploads' && segments[1]) {
      if (segments[2] === 'files' && segments[3] && request.method === 'PUT') {
        return uploadFile(request, env, actor, segments[1], segments[3])
      }
      if (
        segments[2] === 'files' &&
        segments[3] &&
        segments[4] === 'complete' &&
        request.method === 'POST'
      ) {
        return completeMultipartFile(
          request,
          env,
          actor,
          segments[1],
          segments[3],
        )
      }
      if (segments[2] === 'complete' && request.method === 'POST') {
        return completeUpload(env, actor, segments[1])
      }
    }

    throw new HttpError(404, 'not_found', 'API endpoint not found.')
  } catch (error) {
    return errorResponse(error)
  }
}

export const Route = createFileRoute('/api/v1/$')({
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

import { env } from 'cloudflare:workers'
import handler, { createServerEntry } from '@tanstack/react-start/server-entry'
import {
  hostNotFound,
  isAllowedHostPath,
  isApplicationAsset,
} from './server/host-policy'

export default createServerEntry({
  fetch(request) {
    if (!isAllowedHostPath(request, env)) return hostNotFound()
    if (isApplicationAsset(request, env)) return env.ASSETS.fetch(request)
    return handler.fetch(request)
  },
})

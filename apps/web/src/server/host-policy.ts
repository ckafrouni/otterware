import type { Env } from './types'

/**
 * Version preview URLs (wrangler versions upload / Workers Builds PR
 * previews) serve this worker as
 * `<version>-otterware.<subdomain>.workers.dev`. Treat them like the app
 * host so pull request previews are usable.
 */
export function isPreviewHost(hostname: string): boolean {
  if (!hostname.endsWith('.workers.dev')) return false
  const firstLabel = hostname.split('.')[0] ?? ''
  return firstLabel === 'otterware' || firstLabel.endsWith('-otterware')
}

export function isAllowedHostPath(request: Request, env: Env): boolean {
  const url = new URL(request.url)
  if (['localhost', '127.0.0.1'].includes(url.hostname)) return true

  const appHost = new URL(env.APP_URL).host
  const contentHost = new URL(env.CONTENT_URL).host
  if (url.host === appHost || isPreviewHost(url.hostname))
    return !url.pathname.startsWith('/raw/')
  if (url.host === contentHost) {
    return (
      /^\/raw\/session\/[^/]+$/.test(url.pathname) ||
      /^\/raw\/thumbnail\/[^/]+$/.test(url.pathname) ||
      /^\/raw\/a\/[^/]+\/[^/]+\/.+/.test(url.pathname)
    )
  }
  return false
}

const PUBLIC_ASSET_PATHS = new Set([
  '/favicon.ico',
  '/favicon.svg',
  '/logo192.png',
  '/logo512.png',
  '/manifest.json',
  '/robots.txt',
])

export function isApplicationAsset(request: Request, env: Env): boolean {
  const url = new URL(request.url)
  if (url.host !== new URL(env.APP_URL).host && !isPreviewHost(url.hostname))
    return false
  return (
    url.pathname.startsWith('/assets/') || PUBLIC_ASSET_PATHS.has(url.pathname)
  )
}

export function hostNotFound(): Response {
  return new Response('Not found', {
    status: 404,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
      'content-security-policy': "default-src 'none'",
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'no-referrer',
    },
  })
}

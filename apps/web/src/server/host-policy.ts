import type { Env } from './types'

export function isAllowedHostPath(request: Request, env: Env): boolean {
  const url = new URL(request.url)
  if (['localhost', '127.0.0.1'].includes(url.hostname)) return true

  const appHost = new URL(env.APP_URL).host
  const contentHost = new URL(env.CONTENT_URL).host
  if (url.host === appHost) return !url.pathname.startsWith('/raw/')
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
  '/logo192.png',
  '/logo512.png',
  '/manifest.json',
  '/robots.txt',
])

export function isApplicationAsset(request: Request, env: Env): boolean {
  const url = new URL(request.url)
  if (url.host !== new URL(env.APP_URL).host) return false
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

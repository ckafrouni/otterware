import { HttpError } from './http'
import type { Env } from './types'

interface GrantPayload {
  artifactId: string
  versionId: string
  entryPath: string
  expiresAt: number
  nonce: string
}

interface ThumbnailGrantPayload {
  r2Key: string
  expiresAt: number
}

interface ContentFileRow {
  path: string
  content_type: string
  size: number
  r2_key: string
}

const encoder = new TextEncoder()

function base64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
}

function decodeBase64Url(value: string): Uint8Array {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/')
  const binary = atob(normalized)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

async function signingKey(env: Env): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(env.CONTENT_SIGNING_KEY),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

export async function signContentGrant(
  env: Env,
  input: Omit<GrantPayload, 'expiresAt' | 'nonce'>,
): Promise<string> {
  const payload: GrantPayload = {
    ...input,
    expiresAt: Math.floor(Date.now() / 1_000) + 5 * 60,
    nonce: crypto.randomUUID(),
  }
  const body = base64Url(encoder.encode(JSON.stringify(payload)))
  const signature = await crypto.subtle.sign(
    'HMAC',
    await signingKey(env),
    encoder.encode(body),
  )
  return `${body}.${base64Url(new Uint8Array(signature))}`
}

export async function signThumbnailGrant(
  env: Env,
  r2Key: string,
): Promise<string> {
  const payload: ThumbnailGrantPayload = {
    r2Key,
    expiresAt: (Math.floor(Date.now() / 3_600_000) + 2) * 3_600,
  }
  const body = base64Url(encoder.encode(JSON.stringify(payload)))
  const signature = await crypto.subtle.sign(
    'HMAC',
    await signingKey(env),
    encoder.encode(body),
  )
  return `${body}.${base64Url(new Uint8Array(signature))}`
}

async function verifyContentGrant(
  env: Env,
  token: string,
): Promise<GrantPayload> {
  const [body, signature] = token.split('.')
  if (!body || !signature) {
    throw new HttpError(401, 'invalid_grant', 'Invalid content grant.')
  }
  const valid = await crypto.subtle.verify(
    'HMAC',
    await signingKey(env),
    decodeBase64Url(signature) as unknown as BufferSource,
    encoder.encode(body),
  )
  if (!valid)
    throw new HttpError(401, 'invalid_grant', 'Invalid content grant.')
  const payload = JSON.parse(
    new TextDecoder().decode(decodeBase64Url(body)),
  ) as GrantPayload
  if (payload.expiresAt < Math.floor(Date.now() / 1_000)) {
    throw new HttpError(401, 'expired_grant', 'The content grant expired.')
  }
  return payload
}

async function verifyThumbnailGrant(
  env: Env,
  token: string,
): Promise<ThumbnailGrantPayload> {
  const [body, signature] = token.split('.')
  if (!body || !signature) {
    throw new HttpError(401, 'invalid_grant', 'Invalid thumbnail grant.')
  }
  const valid = await crypto.subtle.verify(
    'HMAC',
    await signingKey(env),
    decodeBase64Url(signature) as unknown as BufferSource,
    encoder.encode(body),
  )
  if (!valid)
    throw new HttpError(401, 'invalid_grant', 'Invalid thumbnail grant.')
  const payload = JSON.parse(
    new TextDecoder().decode(decodeBase64Url(body)),
  ) as ThumbnailGrantPayload
  if (payload.expiresAt < Math.floor(Date.now() / 1_000)) {
    throw new HttpError(401, 'expired_grant', 'The thumbnail grant expired.')
  }
  return payload
}

function assertContentOrigin(request: Request, env: Env): void {
  const actual = new URL(request.url)
  const expected = new URL(env.CONTENT_URL)
  const local = ['localhost', '127.0.0.1'].includes(actual.hostname)
  if (!local && actual.host !== expected.host) {
    throw new HttpError(404, 'not_found', 'Content endpoint not found.')
  }
}

function contentCookie(request: Request): string | null {
  const cookie = request.headers.get('cookie') ?? ''
  for (const part of cookie.split(';')) {
    const [name, ...value] = part.trim().split('=')
    if (name === 'otw_content') return value.join('=')
  }
  return null
}

export async function startContentSession(
  request: Request,
  env: Env,
  token: string,
): Promise<Response> {
  assertContentOrigin(request, env)
  const grant = await verifyContentGrant(env, token)
  const destination = new URL(
    `/raw/a/${grant.artifactId}/${grant.versionId}/${grant.entryPath}`,
    env.CONTENT_URL,
  )
  const headers = new Headers({
    location: destination.toString(),
    'cache-control': 'no-store',
    'referrer-policy': 'no-referrer',
  })
  const secure = env.CONTENT_URL.startsWith('https://') ? '; Secure' : ''
  headers.append(
    'set-cookie',
    `otw_content=${token}; Path=/raw/a/${grant.artifactId}/${grant.versionId}/; HttpOnly; SameSite=Lax; Max-Age=300${secure}`,
  )
  return new Response(null, { status: 302, headers })
}

export async function serveRawContent(
  request: Request,
  env: Env,
  artifactId: string,
  versionId: string,
  path: string,
): Promise<Response> {
  assertContentOrigin(request, env)
  const token = contentCookie(request)
  if (!token)
    throw new HttpError(
      401,
      'content_login_required',
      'Content grant required.',
    )
  const grant = await verifyContentGrant(env, token)
  if (grant.artifactId !== artifactId || grant.versionId !== versionId) {
    throw new HttpError(
      403,
      'grant_scope_mismatch',
      'Content grant scope mismatch.',
    )
  }
  const file = await env.DB.prepare(
    `SELECT path, content_type, size, r2_key FROM artifact_file
     WHERE version_id = ? AND path = ?`,
  )
    .bind(versionId, path)
    .first<ContentFileRow>()
  if (!file)
    throw new HttpError(404, 'file_not_found', 'Artifact file not found.')
  const object = await env.ARTIFACTS.get(file.r2_key)
  if (!object)
    throw new HttpError(404, 'file_not_found', 'Artifact body not found.')
  const headers = new Headers({
    'content-type': file.content_type,
    'content-length': String(file.size),
    'cache-control': 'private, max-age=300',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    'cross-origin-resource-policy': 'same-site',
  })
  if (file.content_type.includes('text/html')) {
    headers.set(
      'content-security-policy',
      'sandbox allow-scripts allow-same-origin allow-forms allow-popups allow-downloads allow-modals',
    )
  }
  return new Response(object.body, { headers })
}

export async function serveThumbnail(
  request: Request,
  env: Env,
  token: string,
): Promise<Response> {
  assertContentOrigin(request, env)
  const grant = await verifyThumbnailGrant(env, token)
  if (!grant.r2Key.startsWith('previews/')) {
    throw new HttpError(401, 'invalid_grant', 'Invalid thumbnail grant.')
  }
  const object = await env.ARTIFACTS.get(grant.r2Key)
  if (!object)
    throw new HttpError(404, 'thumbnail_not_found', 'Thumbnail not found.')
  return new Response(object.body, {
    headers: {
      'content-type': object.httpMetadata?.contentType ?? 'image/jpeg',
      'content-length': String(object.size),
      'cache-control': 'public, max-age=3600, immutable',
      'x-content-type-options': 'nosniff',
      'cross-origin-resource-policy': 'same-site',
      'referrer-policy': 'no-referrer',
    },
  })
}

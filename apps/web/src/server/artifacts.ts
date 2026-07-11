import {
  artifactFilesResponseSchema,
  artifactListResponseSchema,
  artifactResponseSchema,
  artifactVersionsResponseSchema,
  completeUploadResponseSchema,
  createArtifactInputSchema,
  createUploadInputSchema,
  updateArtifactInputSchema,
  uploadSessionResponseSchema,
  type Artifact,
  type ArtifactFile,
  type ArtifactVersion,
  type CreateUploadInput,
} from '@otterware/contracts'
import { waitUntil } from 'cloudflare:workers'
import { assertCanWrite, canReadWithKey } from './actor'
import { signContentGrant, signThumbnailGrant } from './content'
import { HttpError, json, parseJson } from './http'
import { generateThumbnail } from './thumbnails'
import type { AuthenticatedActor, Env } from './types'

interface ArtifactRow {
  id: string
  organization_id: string
  owner_user_id: string | null
  created_by_actor_type: 'user' | 'api_key'
  created_by_actor_id: string
  slug: string
  title: string
  description: string
  visibility: 'private' | 'organization'
  state: 'draft' | 'published'
  current_version_id: string | null
  version_count: number
  created_at: string
  updated_at: string
  archived_at: string | null
}

interface VersionRow {
  id: string
  artifact_id: string
  number: number
  label: string
  entry_path: string
  created_at: string
  created_by_user_id: string | null
  created_by_api_key_id: string | null
  created_by_name: string | null
  file_count: number
  byte_size: number
  content_hash: string
  preview_r2_key: string | null
}

interface ArtifactListRow extends ArtifactRow {
  cv_id: string | null
  cv_number: number | null
  cv_label: string | null
  cv_entry_path: string | null
  cv_created_at: string | null
  cv_created_by_user_id: string | null
  cv_created_by_api_key_id: string | null
  cv_created_by_name: string | null
  cv_file_count: number | null
  cv_byte_size: number | null
  cv_content_hash: string | null
  cv_preview_r2_key: string | null
}

interface FileRow {
  version_id: string
  path: string
  content_type: string
  size: number
  sha256: string
  r2_key: string
}

interface UploadRow {
  id: string
  artifact_id: string
  organization_id: string
  actor_type: 'user' | 'api_key'
  actor_id: string
  actor_name: string
  version_id: string
  version_number: number
  expected_current_version: number | null
  label: string
  entry_path: string
  manifest_json: string
  state: 'pending' | 'complete' | 'aborted'
  created_at: string
  expires_at: string
}

type InternalUploadFile = CreateUploadInput['files'][number] & {
  r2Key: string
  multipartUploadId?: string
}

const MULTIPART_PART_SIZE = 50 * 1024 * 1024

function uploadManifest(upload: UploadRow): InternalUploadFile[] {
  return JSON.parse(upload.manifest_json) as InternalUploadFile[]
}

function canRead(row: ArtifactRow, actor: AuthenticatedActor): boolean {
  if (row.organization_id !== actor.organizationId) return false
  if (!canReadWithKey(actor)) return false
  if (row.visibility === 'organization') return true
  return actor.type === 'user' && row.owner_user_id === actor.userId
}

function canModify(row: ArtifactRow, actor: AuthenticatedActor): boolean {
  if (row.organization_id !== actor.organizationId) return false
  if (row.state === 'draft') {
    return (
      row.created_by_actor_type === actor.type &&
      row.created_by_actor_id === actor.id
    )
  }
  return canRead(row, actor)
}

function mapVersion(row: VersionRow): ArtifactVersion {
  const actorId = row.created_by_user_id ?? row.created_by_api_key_id
  return {
    id: row.id,
    number: row.number,
    label: row.label,
    entryPath: row.entry_path,
    createdAt: row.created_at,
    createdBy:
      actorId && row.created_by_name
        ? {
            id: actorId,
            name: row.created_by_name,
            type: row.created_by_user_id ? 'user' : 'api_key',
          }
        : null,
    fileCount: row.file_count,
    byteSize: row.byte_size,
    contentHash: row.content_hash,
  }
}

function mapFile(row: FileRow): ArtifactFile {
  return {
    path: row.path,
    contentType: row.content_type,
    size: row.size,
    sha256: row.sha256,
  }
}

async function versionById(
  env: Env,
  id: string | null,
): Promise<ArtifactVersion | null> {
  if (!id) return null
  const row = await env.DB.prepare(
    'SELECT * FROM artifact_version WHERE id = ?',
  )
    .bind(id)
    .first<VersionRow>()
  return row ? mapVersion(row) : null
}

function mapArtifactRecord(
  env: Env,
  row: ArtifactRow,
  currentVersion: ArtifactVersion | null,
  thumbnailUrl?: string | null,
): Artifact {
  return {
    id: row.id,
    organizationId: row.organization_id,
    ownerUserId: row.owner_user_id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    visibility: row.visibility,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
    currentVersion,
    versionCount: row.version_count,
    url: new URL(`/a/${row.slug}/`, env.APP_URL).toString(),
    ...(thumbnailUrl !== undefined ? { thumbnailUrl } : {}),
  }
}

async function mapArtifact(env: Env, row: ArtifactRow): Promise<Artifact> {
  return mapArtifactRecord(
    env,
    row,
    await versionById(env, row.current_version_id),
  )
}

function joinedCurrentVersion(row: ArtifactListRow): ArtifactVersion | null {
  if (!row.cv_id) return null
  return mapVersion({
    id: row.cv_id,
    artifact_id: row.id,
    number: row.cv_number!,
    label: row.cv_label!,
    entry_path: row.cv_entry_path!,
    created_at: row.cv_created_at!,
    created_by_user_id: row.cv_created_by_user_id,
    created_by_api_key_id: row.cv_created_by_api_key_id,
    created_by_name: row.cv_created_by_name,
    file_count: row.cv_file_count!,
    byte_size: row.cv_byte_size!,
    content_hash: row.cv_content_hash!,
    preview_r2_key: row.cv_preview_r2_key,
  })
}

async function artifactRow(
  env: Env,
  actor: AuthenticatedActor,
  reference: string,
  options: { requireModify?: boolean; includeDraft?: boolean } = {},
): Promise<ArtifactRow> {
  const row = await env.DB.prepare(
    'SELECT * FROM artifact WHERE organization_id = ? AND (id = ? OR slug = ?) LIMIT 1',
  )
    .bind(actor.organizationId, reference, reference)
    .first<ArtifactRow>()
  if (
    !row ||
    (!options.includeDraft && row.state !== 'published') ||
    (options.requireModify ? !canModify(row, actor) : !canRead(row, actor))
  ) {
    throw new HttpError(404, 'artifact_not_found', 'Artifact not found.')
  }
  return row
}

async function audit(
  env: Env,
  actor: AuthenticatedActor,
  action: string,
  resourceId: string,
  metadata: unknown = {},
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO audit_event
      (id, organization_id, actor_type, actor_id, actor_name, action, resource_type, resource_id, metadata_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'artifact', ?, ?, ?)`,
  )
    .bind(
      crypto.randomUUID(),
      actor.organizationId,
      actor.type,
      actor.id,
      actor.name,
      action,
      resourceId,
      JSON.stringify(metadata),
      new Date().toISOString(),
    )
    .run()
}

export async function listArtifacts(
  request: Request,
  env: Env,
  actor: AuthenticatedActor,
): Promise<Response> {
  const url = new URL(request.url)
  const limit = Math.min(
    Math.max(Number(url.searchParams.get('limit')) || 50, 1),
    100,
  )
  const archived = url.searchParams.get('archived')
  const visibility = url.searchParams.get('visibility')
  const cursor = url.searchParams.get('cursor')
  const conditions = [
    'a.organization_id = ?',
    "a.state = 'published'",
    "(a.visibility = 'organization' OR a.owner_user_id = ?)",
  ]
  const bindings: unknown[] = [actor.organizationId, actor.userId ?? '']
  if (archived === 'only') conditions.push('a.archived_at IS NOT NULL')
  else if (archived !== 'true') conditions.push('a.archived_at IS NULL')
  if (visibility === 'private' || visibility === 'organization') {
    conditions.push('a.visibility = ?')
    bindings.push(visibility)
  }
  if (cursor) {
    conditions.push('a.updated_at < ?')
    bindings.push(cursor)
  }
  bindings.push(limit + 1)
  const result = await env.DB.prepare(
    `SELECT a.*,
            v.id AS cv_id, v.number AS cv_number, v.label AS cv_label,
            v.entry_path AS cv_entry_path, v.created_at AS cv_created_at,
            v.created_by_user_id AS cv_created_by_user_id,
            v.created_by_api_key_id AS cv_created_by_api_key_id,
            v.created_by_name AS cv_created_by_name,
            v.file_count AS cv_file_count, v.byte_size AS cv_byte_size,
            v.content_hash AS cv_content_hash,
            v.preview_r2_key AS cv_preview_r2_key
       FROM artifact a
       LEFT JOIN artifact_version v ON v.id = a.current_version_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY a.updated_at DESC
      LIMIT ?`,
  )
    .bind(...bindings)
    .all<ArtifactListRow>()
  const hasMore = result.results.length > limit
  const rows = result.results.slice(0, limit)
  const artifacts = await Promise.all(
    rows.map(async (row) => {
      const thumbnailUrl = row.cv_preview_r2_key
        ? new URL(
            `/raw/thumbnail/${await signThumbnailGrant(env, row.cv_preview_r2_key)}`,
            env.CONTENT_URL,
          ).toString()
        : null
      return mapArtifactRecord(
        env,
        row,
        joinedCurrentVersion(row),
        thumbnailUrl,
      )
    }),
  )
  return json(
    artifactListResponseSchema.parse({
      data: artifacts,
      pagination: {
        nextCursor: hasMore ? (rows.at(-1)?.updated_at ?? null) : null,
      },
    }),
  )
}

export async function showArtifact(
  env: Env,
  actor: AuthenticatedActor,
  reference: string,
): Promise<Response> {
  const row = await artifactRow(env, actor, reference)
  return json(
    artifactResponseSchema.parse({ data: await mapArtifact(env, row) }),
  )
}

export async function createArtifact(
  request: Request,
  env: Env,
  actor: AuthenticatedActor,
): Promise<Response> {
  assertCanWrite(actor, 'create')
  const input = createArtifactInputSchema.parse(await parseJson(request))
  if (actor.type === 'api_key' && input.visibility === 'private') {
    throw new HttpError(
      400,
      'private_requires_user',
      'Organization API keys cannot create private artifacts.',
    )
  }
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  try {
    await env.DB.prepare(
      `INSERT INTO artifact
        (id, organization_id, owner_user_id, created_by_actor_type, created_by_actor_id, slug, title, description, visibility, state, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)`,
    )
      .bind(
        id,
        actor.organizationId,
        actor.userId,
        actor.type,
        actor.id,
        input.slug,
        input.title,
        input.description,
        input.visibility,
        now,
        now,
      )
      .run()
  } catch (error) {
    if (String(error).includes('UNIQUE')) {
      throw new HttpError(
        409,
        'slug_exists',
        'That artifact slug already exists in this organization.',
      )
    }
    throw error
  }
  const row = await artifactRow(env, actor, id, {
    requireModify: true,
    includeDraft: true,
  })
  await audit(env, actor, 'artifact.created', id)
  return json(
    artifactResponseSchema.parse({ data: await mapArtifact(env, row) }),
    {
      status: 201,
    },
  )
}

export async function updateArtifact(
  request: Request,
  env: Env,
  actor: AuthenticatedActor,
  reference: string,
): Promise<Response> {
  assertCanWrite(actor, 'update')
  const row = await artifactRow(env, actor, reference, { requireModify: true })
  const input = updateArtifactInputSchema.parse(await parseJson(request))
  if (actor.type === 'api_key' && input.visibility === 'private') {
    throw new HttpError(
      400,
      'private_requires_user',
      'Organization API keys cannot make artifacts private.',
    )
  }
  const fields: string[] = []
  const values: unknown[] = []
  for (const [key, value] of Object.entries(input)) {
    const column =
      key === 'description' ||
      key === 'visibility' ||
      key === 'slug' ||
      key === 'title'
        ? key
        : null
    if (column) {
      fields.push(`${column} = ?`)
      values.push(value)
    }
  }
  fields.push('updated_at = ?')
  values.push(new Date().toISOString(), row.id)
  try {
    await env.DB.prepare(
      `UPDATE artifact SET ${fields.join(', ')} WHERE id = ?`,
    )
      .bind(...values)
      .run()
  } catch (error) {
    if (String(error).includes('UNIQUE')) {
      throw new HttpError(
        409,
        'slug_exists',
        'That artifact slug already exists.',
      )
    }
    throw error
  }
  await audit(env, actor, 'artifact.updated', row.id, input)
  return showArtifact(env, actor, row.id)
}

export async function archiveArtifact(
  env: Env,
  actor: AuthenticatedActor,
  reference: string,
  restore = false,
): Promise<Response> {
  assertCanWrite(actor, 'archive')
  const row = await artifactRow(env, actor, reference, { requireModify: true })
  const now = new Date().toISOString()
  await env.DB.prepare(
    'UPDATE artifact SET archived_at = ?, updated_at = ? WHERE id = ?',
  )
    .bind(restore ? null : now, now, row.id)
    .run()
  await audit(
    env,
    actor,
    restore ? 'artifact.restored' : 'artifact.archived',
    row.id,
  )
  return showArtifact(env, actor, row.id)
}

export async function deleteDraft(
  env: Env,
  actor: AuthenticatedActor,
  reference: string,
): Promise<Response> {
  const row = await artifactRow(env, actor, reference, {
    requireModify: true,
    includeDraft: true,
  })
  if (row.state !== 'draft') {
    throw new HttpError(
      409,
      'not_a_draft',
      'Published artifacts cannot be deleted.',
    )
  }
  await env.DB.prepare('DELETE FROM artifact WHERE id = ?').bind(row.id).run()
  return new Response(null, { status: 204 })
}

export async function listVersions(
  env: Env,
  actor: AuthenticatedActor,
  reference: string,
): Promise<Response> {
  const row = await artifactRow(env, actor, reference)
  const result = await env.DB.prepare(
    'SELECT * FROM artifact_version WHERE artifact_id = ? ORDER BY number DESC',
  )
    .bind(row.id)
    .all<VersionRow>()
  return json(
    artifactVersionsResponseSchema.parse({
      data: result.results.map(mapVersion),
      pagination: { nextCursor: null },
    }),
  )
}

async function selectedVersion(
  request: Request,
  env: Env,
  artifact: ArtifactRow,
): Promise<VersionRow> {
  const requested = new URL(request.url).searchParams.get('version')
  const row = requested
    ? await env.DB.prepare(
        'SELECT * FROM artifact_version WHERE artifact_id = ? AND number = ?',
      )
        .bind(artifact.id, Number(requested))
        .first<VersionRow>()
    : artifact.current_version_id
      ? await env.DB.prepare('SELECT * FROM artifact_version WHERE id = ?')
          .bind(artifact.current_version_id)
          .first<VersionRow>()
      : null
  if (!row) throw new HttpError(404, 'version_not_found', 'Version not found.')
  return row
}

export async function listFiles(
  request: Request,
  env: Env,
  actor: AuthenticatedActor,
  reference: string,
): Promise<Response> {
  const artifact = await artifactRow(env, actor, reference)
  const version = await selectedVersion(request, env, artifact)
  const result = await env.DB.prepare(
    'SELECT * FROM artifact_file WHERE version_id = ? ORDER BY path',
  )
    .bind(version.id)
    .all<FileRow>()
  return json(
    artifactFilesResponseSchema.parse({ data: result.results.map(mapFile) }),
  )
}

export async function readContent(
  request: Request,
  env: Env,
  actor: AuthenticatedActor,
  reference: string,
): Promise<Response> {
  const artifact = await artifactRow(env, actor, reference)
  const version = await selectedVersion(request, env, artifact)
  const requestedPath =
    new URL(request.url).searchParams.get('path') ?? version.entry_path
  const file = await env.DB.prepare(
    'SELECT * FROM artifact_file WHERE version_id = ? AND path = ?',
  )
    .bind(version.id, requestedPath)
    .first<FileRow>()
  if (!file) throw new HttpError(404, 'file_not_found', 'File not found.')
  const object = await env.ARTIFACTS.get(file.r2_key)
  if (!object)
    throw new HttpError(404, 'file_not_found', 'File body not found.')
  const headers = new Headers()
  headers.set('content-type', file.content_type)
  headers.set('content-length', String(file.size))
  headers.set('etag', object.httpEtag)
  headers.set('cache-control', 'private, no-store')
  headers.set('x-content-type-options', 'nosniff')
  return new Response(object.body, { headers })
}

export async function previewArtifact(
  request: Request,
  env: Env,
  actor: AuthenticatedActor,
  reference: string,
): Promise<Response> {
  const artifact = await artifactRow(env, actor, reference)
  const version = await selectedVersion(request, env, artifact)
  const token = await signContentGrant(env, {
    artifactId: artifact.id,
    versionId: version.id,
    entryPath: version.entry_path,
  })
  return json({
    data: {
      url: new URL(`/raw/session/${token}`, env.CONTENT_URL).toString(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1_000).toISOString(),
      version: mapVersion(version),
    },
  })
}

export async function regenerateThumbnail(
  request: Request,
  env: Env,
  actor: AuthenticatedActor,
  reference: string,
): Promise<Response> {
  assertCanWrite(actor, 'update')
  const artifact = await artifactRow(env, actor, reference, {
    requireModify: true,
  })
  const version = await selectedVersion(request, env, artifact)
  const r2Key = await generateThumbnail(
    env,
    artifact.id,
    version.id,
    version.entry_path,
  )
  return json({ data: { version: version.number, r2Key } })
}

function encodePath(path: string): string {
  return btoa(unescape(encodeURIComponent(path)))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
}

function decodePath(value: string): string {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/')
  return decodeURIComponent(escape(atob(normalized)))
}

async function loadUpload(
  env: Env,
  actor: AuthenticatedActor,
  id: string,
): Promise<UploadRow> {
  const row = await env.DB.prepare('SELECT * FROM artifact_upload WHERE id = ?')
    .bind(id)
    .first<UploadRow>()
  if (
    !row ||
    row.organization_id !== actor.organizationId ||
    row.actor_type !== actor.type ||
    row.actor_id !== actor.id
  ) {
    throw new HttpError(404, 'upload_not_found', 'Upload session not found.')
  }
  if (row.state !== 'pending') {
    throw new HttpError(409, 'upload_closed', 'This upload session is closed.')
  }
  if (new Date(row.expires_at) < new Date()) {
    throw new HttpError(410, 'upload_expired', 'This upload session expired.')
  }
  return row
}

export async function createUpload(
  request: Request,
  env: Env,
  actor: AuthenticatedActor,
  reference: string,
): Promise<Response> {
  assertCanWrite(actor, 'update')
  const artifact = await artifactRow(env, actor, reference, {
    requireModify: true,
    includeDraft: true,
  })
  const input = createUploadInputSchema.parse(await parseJson(request))
  if (
    input.expectedCurrentVersion !== undefined &&
    input.expectedCurrentVersion !== artifact.version_count
  ) {
    throw new HttpError(
      409,
      'version_conflict',
      `Current version is ${artifact.version_count}, not ${input.expectedCurrentVersion}.`,
    )
  }
  if (!input.files.some((file) => file.path === input.entryPath)) {
    throw new HttpError(
      400,
      'entry_missing',
      'The entry path is not present in the file manifest.',
    )
  }
  if (
    new Set(input.files.map((file) => file.path)).size !== input.files.length
  ) {
    throw new HttpError(400, 'duplicate_path', 'File paths must be unique.')
  }
  const id = crypto.randomUUID()
  const versionId = crypto.randomUUID()
  const createdAt = new Date()
  const expiresAt = new Date(createdAt.getTime() + 2 * 60 * 60 * 1_000)
  const internalFiles = await Promise.all(
    input.files.map(async (file): Promise<InternalUploadFile> => {
      const r2Key = `versions/${artifact.id}/${versionId}/${file.path}`
      if (file.size <= MULTIPART_PART_SIZE) return { ...file, r2Key }
      const multipart = await env.ARTIFACTS.createMultipartUpload(r2Key, {
        httpMetadata: { contentType: file.contentType },
        customMetadata: { sha256: file.sha256, uploadId: id },
      })
      return { ...file, r2Key, multipartUploadId: multipart.uploadId }
    }),
  )
  await env.DB.prepare(
    `INSERT INTO artifact_upload
      (id, artifact_id, organization_id, actor_type, actor_id, actor_name, version_id, version_number,
       expected_current_version, label, entry_path, manifest_json, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      artifact.id,
      actor.organizationId,
      actor.type,
      actor.id,
      actor.name,
      versionId,
      artifact.version_count + 1,
      input.expectedCurrentVersion ?? null,
      input.label,
      input.entryPath,
      JSON.stringify(internalFiles),
      createdAt.toISOString(),
      expiresAt.toISOString(),
    )
    .run()
  return json(
    uploadSessionResponseSchema.parse({
      data: {
        id,
        artifactId: artifact.id,
        expiresAt: expiresAt.toISOString(),
        files: internalFiles.map((file) => ({
          path: file.path,
          uploadUrl: new URL(
            `/api/v1/uploads/${id}/files/${encodePath(file.path)}`,
            env.APP_URL,
          ).toString(),
          multipart: Boolean(file.multipartUploadId),
          ...(file.multipartUploadId ? { partSize: MULTIPART_PART_SIZE } : {}),
        })),
      },
    }),
    { status: 201 },
  )
}

export async function uploadFile(
  request: Request,
  env: Env,
  actor: AuthenticatedActor,
  uploadId: string,
  encodedPath: string,
): Promise<Response> {
  const upload = await loadUpload(env, actor, uploadId)
  const path = decodePath(encodedPath)
  const files = uploadManifest(upload)
  const expected = files.find((file) => file.path === path)
  if (!expected)
    throw new HttpError(404, 'file_not_expected', 'Unexpected file path.')
  if (!request.body)
    throw new HttpError(400, 'body_required', 'File body required.')
  const suppliedHash = request.headers.get('x-content-sha256')
  if (suppliedHash !== expected.sha256) {
    throw new HttpError(
      400,
      'hash_mismatch',
      'File hash does not match manifest.',
    )
  }
  const length = Number(request.headers.get('content-length'))
  if (expected.multipartUploadId) {
    const partNumber = Number(new URL(request.url).searchParams.get('part'))
    const totalParts = Math.ceil(expected.size / MULTIPART_PART_SIZE)
    if (
      !Number.isInteger(partNumber) ||
      partNumber < 1 ||
      partNumber > totalParts
    ) {
      throw new HttpError(400, 'invalid_part', 'Invalid multipart part number.')
    }
    const expectedLength =
      partNumber === totalParts
        ? expected.size - (partNumber - 1) * MULTIPART_PART_SIZE
        : MULTIPART_PART_SIZE
    if (length !== expectedLength) {
      throw new HttpError(
        400,
        'size_mismatch',
        'Multipart size does not match.',
      )
    }
    const multipart = env.ARTIFACTS.resumeMultipartUpload(
      expected.r2Key,
      expected.multipartUploadId,
    )
    const part = await multipart.uploadPart(partNumber, request.body)
    return json({ data: { partNumber: part.partNumber, etag: part.etag } })
  }
  if (length !== expected.size) {
    throw new HttpError(
      400,
      'size_mismatch',
      'File size does not match manifest.',
    )
  }
  await env.ARTIFACTS.put(expected.r2Key, request.body, {
    httpMetadata: { contentType: expected.contentType },
    customMetadata: { sha256: expected.sha256, uploadId },
  })
  return new Response(null, { status: 204 })
}

export async function completeMultipartFile(
  request: Request,
  env: Env,
  actor: AuthenticatedActor,
  uploadId: string,
  encodedPath: string,
): Promise<Response> {
  const upload = await loadUpload(env, actor, uploadId)
  const path = decodePath(encodedPath)
  const expected = uploadManifest(upload).find((file) => file.path === path)
  if (!expected?.multipartUploadId) {
    throw new HttpError(
      404,
      'multipart_not_found',
      'Multipart upload not found.',
    )
  }
  const body = (await parseJson(request)) as {
    parts?: Array<{ partNumber?: unknown; etag?: unknown }>
  }
  const parts = body.parts?.map((part) => ({
    partNumber: Number(part.partNumber),
    etag: String(part.etag),
  }))
  const expectedCount = Math.ceil(expected.size / MULTIPART_PART_SIZE)
  if (
    !parts ||
    parts.length !== expectedCount ||
    parts.some(
      (part, index) =>
        part.partNumber !== index + 1 ||
        !part.etag ||
        part.etag === 'undefined',
    )
  ) {
    throw new HttpError(
      400,
      'invalid_parts',
      'Every multipart upload part must be supplied in order.',
    )
  }
  await env.ARTIFACTS.resumeMultipartUpload(
    expected.r2Key,
    expected.multipartUploadId,
  ).complete(parts)
  return new Response(null, { status: 204 })
}

async function manifestHash(
  files: CreateUploadInput['files'],
): Promise<string> {
  const value = files
    .map((file) => `${file.path}\0${file.sha256}\0${file.size}`)
    .sort()
    .join('\n')
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  )
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export async function completeUpload(
  env: Env,
  actor: AuthenticatedActor,
  uploadId: string,
): Promise<Response> {
  const upload = await loadUpload(env, actor, uploadId)
  const artifact = await artifactRow(env, actor, upload.artifact_id, {
    requireModify: true,
    includeDraft: true,
  })
  if (artifact.version_count !== upload.version_number - 1) {
    throw new HttpError(
      409,
      'version_conflict',
      'Another version was published while this upload was in progress. Start a new push.',
    )
  }
  const files = uploadManifest(upload)
  await Promise.all(
    files.map(async (file) => {
      const object = await env.ARTIFACTS.head(file.r2Key)
      if (
        !object ||
        object.size !== file.size ||
        object.customMetadata?.sha256 !== file.sha256
      ) {
        throw new HttpError(
          409,
          'upload_incomplete',
          `File is missing or incomplete: ${file.path}`,
        )
      }
    }),
  )
  const now = new Date().toISOString()
  const byteSize = files.reduce((total, file) => total + file.size, 0)
  const contentHash = await manifestHash(files)
  const statements = [
    env.DB.prepare(
      `INSERT INTO artifact_version
        (id, artifact_id, number, label, entry_path, created_at, created_by_user_id, created_by_api_key_id,
         created_by_name, file_count, byte_size, content_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      upload.version_id,
      artifact.id,
      upload.version_number,
      upload.label,
      upload.entry_path,
      now,
      actor.userId,
      actor.type === 'api_key' ? actor.id : null,
      actor.name,
      files.length,
      byteSize,
      contentHash,
    ),
    ...files.map((file) =>
      env.DB.prepare(
        `INSERT INTO artifact_file (version_id, path, content_type, size, sha256, r2_key)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).bind(
        upload.version_id,
        file.path,
        file.contentType,
        file.size,
        file.sha256,
        file.r2Key,
      ),
    ),
    env.DB.prepare(
      `UPDATE artifact
       SET state = 'published', current_version_id = ?, version_count = ?, updated_at = ?
       WHERE id = ? AND version_count = ?`,
    ).bind(
      upload.version_id,
      upload.version_number,
      now,
      artifact.id,
      artifact.version_count,
    ),
    env.DB.prepare(
      "UPDATE artifact_upload SET state = 'complete' WHERE id = ?",
    ).bind(upload.id),
  ]
  try {
    await env.DB.batch(statements)
  } catch (error) {
    if (String(error).includes('UNIQUE')) {
      throw new HttpError(
        409,
        'version_conflict',
        'Another version was published while this upload was finalizing.',
      )
    }
    throw error
  }
  await audit(env, actor, 'artifact.version_published', artifact.id, {
    version: upload.version_number,
    versionId: upload.version_id,
  })
  const updatedRow = await artifactRow(env, actor, artifact.id)
  const version = await env.DB.prepare(
    'SELECT * FROM artifact_version WHERE id = ?',
  )
    .bind(upload.version_id)
    .first<VersionRow>()
  if (!version) throw new Error('Published version could not be loaded')
  waitUntil(
    generateThumbnail(env, artifact.id, version.id, version.entry_path).catch(
      (error: unknown) => {
        console.error('Artifact thumbnail generation failed', error)
      },
    ),
  )
  return json(
    completeUploadResponseSchema.parse({
      data: {
        artifact: await mapArtifact(env, updatedRow),
        version: mapVersion(version),
      },
    }),
    { status: 201 },
  )
}

export async function promoteVersion(
  request: Request,
  env: Env,
  actor: AuthenticatedActor,
  reference: string,
): Promise<Response> {
  assertCanWrite(actor, 'update')
  const artifact = await artifactRow(env, actor, reference, {
    requireModify: true,
  })
  const input = (await parseJson(request)) as { version?: unknown }
  const number = Number(input.version)
  if (!Number.isInteger(number) || number < 1) {
    throw new HttpError(
      400,
      'invalid_version',
      'Version must be a positive integer.',
    )
  }
  const version = await env.DB.prepare(
    'SELECT * FROM artifact_version WHERE artifact_id = ? AND number = ?',
  )
    .bind(artifact.id, number)
    .first<VersionRow>()
  if (!version)
    throw new HttpError(404, 'version_not_found', 'Version not found.')
  await env.DB.prepare(
    'UPDATE artifact SET current_version_id = ?, updated_at = ? WHERE id = ?',
  )
    .bind(version.id, new Date().toISOString(), artifact.id)
    .run()
  await audit(env, actor, 'artifact.version_promoted', artifact.id, {
    version: number,
  })
  return showArtifact(env, actor, artifact.id)
}

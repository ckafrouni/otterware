import { useEffect, useMemo, useRef, useState } from 'react'
import { FolderOpen, Upload } from 'lucide-react'
import {
  artifactResponseSchema,
  completeUploadResponseSchema,
  uploadSessionResponseSchema,
  type Artifact,
} from '@otterware/contracts'
import { api } from '#/lib/api'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

const MULTIPART_PART_SIZE = 50 * 1024 * 1024

interface PickedFile {
  file: File
  path: string
}

const mimeByExtension: Record<string, string> = {
  html: 'text/html',
  htm: 'text/html',
  css: 'text/css',
  js: 'text/javascript',
  mjs: 'text/javascript',
  json: 'application/json',
  md: 'text/markdown',
  txt: 'text/plain',
  csv: 'text/csv',
  tsv: 'text/tab-separated-values',
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  woff: 'font/woff',
  woff2: 'font/woff2',
}

function contentTypeFor(file: File, path: string): string {
  if (file.type) return file.type
  const extension = path.split('.').pop()?.toLowerCase() ?? ''
  return mimeByExtension[extension] ?? 'application/octet-stream'
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function pickEntryPath(files: PickedFile[]): string {
  if (files.length === 1) return files[0]!.path
  const paths = files.map((file) => file.path)
  return (
    paths.find((path) => path === 'index.html') ??
    paths.find((path) => path.endsWith('/index.html')) ??
    paths.find((path) => /\.html?$/.test(path)) ??
    paths[0]!
  )
}

function relativePaths(list: FileList): PickedFile[] {
  const files = Array.from(list).map((file) => ({
    file,
    path: file.webkitRelativePath || file.name,
  }))
  // A folder pick prefixes every path with the folder name; strip it so the
  // entry path is `index.html`, not `dist/index.html`.
  const root = files[0]?.path.split('/')[0]
  const folderPick =
    files.length > 0 &&
    files.every(
      (file) => file.path.includes('/') && file.path.startsWith(`${root}/`),
    )
  return folderPick
    ? files.map((file) => ({
        ...file,
        path: file.path.slice(root!.length + 1),
      }))
    : files
}

async function sha256(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function UploadArtifactDialog({
  open,
  organizationId,
  onOpenChange,
  onUploaded,
}: {
  open: boolean
  organizationId: string | undefined
  onOpenChange: (open: boolean) => void
  onUploaded: (artifact: Artifact) => void
}) {
  const [files, setFiles] = useState<PickedFile[]>([])
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const folderInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) return
    setFiles([])
    setTitle('')
    setSlug('')
    setSlugEdited(false)
    setStatus(null)
    setError(null)
    setBusy(false)
  }, [open])

  const totalBytes = useMemo(
    () => files.reduce((sum, item) => sum + item.file.size, 0),
    [files],
  )
  const entryPath = files.length > 0 ? pickEntryPath(files) : null

  function pick(list: FileList | null) {
    if (!list || list.length === 0) return
    const picked = relativePaths(list)
    setFiles(picked)
    setError(null)
    if (!title) {
      const source =
        picked.length === 1
          ? picked[0]!.file.name
          : (list[0]!.webkitRelativePath.split('/')[0] ?? '')
      const suggested = source.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ')
      setTitle(suggested)
      if (!slugEdited) setSlug(slugify(suggested))
    }
  }

  async function upload() {
    if (!organizationId || files.length === 0 || !entryPath) return
    const finalSlug = slug || slugify(title)
    if (!title.trim() || !finalSlug) {
      setError('A title and slug are required.')
      return
    }
    setBusy(true)
    setError(null)
    let artifactId: string | null = null
    try {
      setStatus('Preparing files…')
      const manifest = await Promise.all(
        files.map(async ({ file, path }) => ({
          path,
          contentType: contentTypeFor(file, path),
          size: file.size,
          sha256: await sha256(file),
        })),
      )
      setStatus('Creating artifact…')
      const created = artifactResponseSchema.parse(
        await api<unknown>('/api/v1/artifacts', {
          method: 'POST',
          organizationId,
          body: JSON.stringify({
            slug: finalSlug,
            title: title.trim(),
            entryPath,
            label: 'Initial version',
          }),
        }),
      ).data
      artifactId = created.id
      const session = uploadSessionResponseSchema.parse(
        await api<unknown>(
          `/api/v1/artifacts/${encodeURIComponent(created.id)}/uploads`,
          {
            method: 'POST',
            organizationId,
            body: JSON.stringify({
              label: 'Initial version',
              entryPath,
              files: manifest,
            }),
          },
        ),
      ).data
      const byPath = new Map(files.map((item) => [item.path, item.file]))
      const hashByPath = new Map(manifest.map((item) => [item.path, item]))
      let done = 0
      for (const remote of session.files) {
        const file = byPath.get(remote.path)
        const meta = hashByPath.get(remote.path)
        if (!file || !meta) throw new Error(`Unexpected file: ${remote.path}`)
        setStatus(`Uploading ${++done}/${session.files.length}: ${remote.path}`)
        const headers = {
          'content-type': meta.contentType,
          'x-content-sha256': meta.sha256,
          'x-otterware-organization': organizationId,
        }
        if (remote.multipart) {
          const partSize = remote.partSize ?? MULTIPART_PART_SIZE
          const count = Math.ceil(file.size / partSize)
          const parts: Array<{ partNumber: number; etag: string }> = []
          for (let partNumber = 1; partNumber <= count; partNumber += 1) {
            const url = new URL(remote.uploadUrl)
            url.searchParams.set('part', String(partNumber))
            const result = await api<{
              data: { partNumber: number; etag: string }
            }>(url.toString(), {
              method: 'PUT',
              headers,
              body: file.slice(
                (partNumber - 1) * partSize,
                partNumber * partSize,
              ),
            })
            parts.push(result.data)
          }
          await api<unknown>(`${remote.uploadUrl}/complete`, {
            method: 'POST',
            organizationId,
            body: JSON.stringify({ parts }),
          })
        } else {
          await api<void>(remote.uploadUrl, {
            method: 'PUT',
            headers,
            body: file,
          })
        }
      }
      setStatus('Publishing…')
      const completed = completeUploadResponseSchema.parse(
        await api<unknown>(
          `/api/v1/uploads/${encodeURIComponent(session.id)}/complete`,
          { method: 'POST', organizationId },
        ),
      ).data
      onUploaded(completed.artifact)
      onOpenChange(false)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
      setStatus(null)
      if (artifactId) {
        await api<void>(
          `/api/v1/artifacts/${encodeURIComponent(artifactId)}/draft`,
          { method: 'DELETE', organizationId },
        ).catch(() => undefined)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="upload-dialog">
        <div className="upload-dialog-header">
          <DialogTitle>Upload artifact</DialogTitle>
          <DialogDescription>
            Upload a file or a folder. Every upload becomes version 1 of a new
            artifact.
          </DialogDescription>
        </div>
        <input
          ref={fileInput}
          type="file"
          multiple
          hidden
          onChange={(event) => pick(event.target.files)}
        />
        <input
          ref={folderInput}
          type="file"
          hidden
          // @ts-expect-error non-standard attribute understood by browsers
          webkitdirectory=""
          onChange={(event) => pick(event.target.files)}
        />
        <div
          className="upload-dropzone"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault()
            pick(event.dataTransfer.files)
          }}
        >
          {files.length === 0 ? (
            <>
              <p>Drop files here, or</p>
              <div className="upload-dropzone-actions">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInput.current?.click()}
                >
                  <Upload /> Choose files
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => folderInput.current?.click()}
                >
                  <FolderOpen /> Choose folder
                </Button>
              </div>
            </>
          ) : (
            <>
              <strong>
                {files.length} {files.length === 1 ? 'file' : 'files'} ·{' '}
                {formatBytes(totalBytes)}
              </strong>
              <p>
                Entry: <code>{entryPath}</code>
              </p>
              <button
                type="button"
                className="upload-dropzone-reset"
                disabled={busy}
                onClick={() => setFiles([])}
              >
                Change selection
              </button>
            </>
          )}
        </div>
        <label className="upload-field">
          <span>Title</span>
          <Input
            value={title}
            disabled={busy}
            onChange={(event) => {
              setTitle(event.target.value)
              if (!slugEdited) setSlug(slugify(event.target.value))
            }}
            placeholder="Quarterly report"
          />
        </label>
        <label className="upload-field">
          <span>Slug</span>
          <Input
            value={slug}
            disabled={busy}
            onChange={(event) => {
              setSlugEdited(true)
              setSlug(slugify(event.target.value))
            }}
            placeholder="quarterly-report"
          />
        </label>
        {error && <p className="upload-error">{error}</p>}
        <div className="upload-dialog-footer">
          <span className="upload-status">{status}</span>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={busy || files.length === 0 || !organizationId}
            onClick={() => void upload()}
          >
            <Upload /> {busy ? 'Uploading…' : 'Upload'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

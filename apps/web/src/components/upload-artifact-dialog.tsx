import { useEffect, useMemo, useRef, useState } from 'react'
import { FolderOpen, Upload } from 'lucide-react'
import type { Artifact } from '@otterware/contracts'
import {
  pickEntryPath,
  relativePaths,
  slugify,
  titleFromName,
  uploadDocument,
  type PickedFile,
} from '#/lib/upload-document'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

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
      const suggested = titleFromName(source)
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
    try {
      const uploaded = await uploadDocument({
        organizationId,
        files,
        title: title.trim(),
        slug: finalSlug,
        onStatus: setStatus,
      })
      onUploaded(uploaded)
      onOpenChange(false)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
      setStatus(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="upload-dialog">
        <div className="upload-dialog-header">
          <DialogTitle>Upload document</DialogTitle>
          <DialogDescription>
            Upload a file or a folder. Every upload becomes version 1 of a new
            document.
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

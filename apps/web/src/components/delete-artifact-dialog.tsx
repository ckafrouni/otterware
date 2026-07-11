import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import type { Artifact } from '@otterware/contracts'
import { api } from '#/lib/api'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'

export function DeleteArtifactDialog({
  artifact,
  onDeleted,
  onOpenChange,
}: {
  artifact: Artifact | null
  onDeleted: (artifact: Artifact) => void
  onOpenChange: (open: boolean) => void
}) {
  const [confirmation, setConfirmation] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setConfirmation('')
    setError(null)
  }, [artifact?.id])

  async function deletePermanently() {
    if (!artifact || confirmation !== artifact.slug) return
    setDeleting(true)
    setError(null)
    try {
      await api<void>(
        `/api/v1/artifacts/${encodeURIComponent(artifact.id)}/permanent`,
        { method: 'DELETE' },
      )
      onDeleted(artifact)
      onOpenChange(false)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AlertDialog
      open={artifact !== null}
      onOpenChange={(open) => onOpenChange(open)}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="text-destructive">
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete artifact permanently?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes every version and file for{' '}
            <strong>{artifact?.title}</strong>. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <label className="delete-confirmation-field">
          <span>
            Type <strong>{artifact?.slug}</strong> to confirm
          </span>
          <Input
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        {error && <p className="delete-dialog-error">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={!artifact || confirmation !== artifact.slug || deleting}
            onClick={() => void deletePermanently()}
          >
            {deleting ? 'Deleting…' : 'Delete permanently'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

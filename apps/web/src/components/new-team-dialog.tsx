import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { authClient } from '#/lib/auth-client'
import { useOrganizations } from '@/hooks/use-organizations'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { slugify } from './upload-artifact-dialog'

export function NewTeamDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { selectOrganization } = useOrganizations()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function create(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    const base = slugify(trimmed) || 'team'
    if (!trimmed) return
    setBusy(true)
    setError(null)
    try {
      // Team slugs are global; fall back to a suffixed slug when taken.
      let result = await authClient.organization.create({
        name: trimmed,
        slug: base,
        keepCurrentActiveOrganization: true,
      })
      if (result.error) {
        result = await authClient.organization.create({
          name: trimmed,
          slug: `${base}-${crypto.randomUUID().slice(0, 6)}`,
          keepCurrentActiveOrganization: true,
        })
      }
      if (result.error || !result.data) {
        setError(result.error?.message ?? 'Could not create the team.')
        return
      }
      window.dispatchEvent(new Event('otterdrive:organizations-changed'))
      await selectOrganization(result.data.id)
      setName('')
      onOpenChange(false)
      await navigate({ to: '/home' })
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Could not create the team.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="upload-dialog">
        <form className="new-team-form" onSubmit={create}>
          <div className="upload-dialog-header">
            <DialogTitle>New team</DialogTitle>
            <DialogDescription>
              A team has its own documents, collaborators, and agent keys.
            </DialogDescription>
          </div>
          <label className="upload-field">
            <span>Name</span>
            <Input
              autoFocus
              required
              value={name}
              disabled={busy}
              onChange={(event) => setName(event.target.value)}
              placeholder="Marketing"
            />
          </label>
          {error && <p className="upload-error">{error}</p>}
          <div className="upload-dialog-footer">
            <span className="upload-status" />
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !name.trim()}>
              <Plus /> {busy ? 'Creating…' : 'Create team'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

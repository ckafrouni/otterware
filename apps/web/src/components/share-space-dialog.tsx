import { useState } from 'react'
import { Check, Copy, KeyRound, Sparkles, UserPlus, Users } from 'lucide-react'
import { authClient } from '#/lib/auth-client'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export interface ShareSpaceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  spaceId: string | undefined
  spaceName: string | undefined
}

export function ShareSpaceDialog({
  open,
  onOpenChange,
  spaceId,
  spaceName,
}: ShareSpaceDialogProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'viewer' | 'editor' | 'admin'>('viewer')
  const [loading, setLoading] = useState(false)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedKey, setCopiedKey] = useState(false)
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [message, setMessage] = useState<{
    kind: 'error' | 'success'
    text: string
  } | null>(null)

  const spaceUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/artifacts` : ''

  async function handleInvite(event: React.FormEvent) {
    event.preventDefault()
    if (!spaceId || !email) return
    setLoading(true)
    setMessage(null)
    try {
      const result = await authClient.organization.inviteMember({
        email,
        role,
        organizationId: spaceId,
      })
      if (result.error) {
        setMessage({
          kind: 'error',
          text: result.error.message ?? 'Could not create invitation.',
        })
      } else if (result.data) {
        const link = `${window.location.origin}/invite/${result.data.id}`
        setInviteUrl(link)
        setEmail('')
        setMessage({
          kind: 'success',
          text: 'Invitation generated! Share the link with your collaborator.',
        })
      }
    } catch (err) {
      setMessage({
        kind: 'error',
        text: err instanceof Error ? err.message : String(err),
      })
    } finally {
      setLoading(false)
    }
  }

  async function generateAgentKey() {
    if (!spaceId) return
    setLoading(true)
    try {
      const result = await authClient.apiKey.create({
        configId: 'organization',
        organizationId: spaceId,
        name: `Agent-${Date.now().toString().slice(-4)}`,
        prefix: 'otw_',
      })
      if (result.error) {
        setMessage({
          kind: 'error',
          text: result.error.message ?? 'Could not generate agent key.',
        })
      } else if (result.data) {
        setCreatedKey(result.data.key)
        setMessage({
          kind: 'success',
          text: 'Agent API token generated. Save it securely.',
        })
      }
    } catch (err) {
      setMessage({
        kind: 'error',
        text: err instanceof Error ? err.message : String(err),
      })
    } finally {
      setLoading(false)
    }
  }

  function copySpaceLink() {
    void navigator.clipboard.writeText(spaceUrl)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="share-space-modal max-w-lg">
        <DialogTitle className="flex items-center gap-2">
          <Users size={18} />
          <span>Collaborate in {spaceName ?? 'Space'}</span>
        </DialogTitle>
        <DialogDescription>
          Invite teammates or connect autonomous AI agents to this shared space.
        </DialogDescription>

        {message && (
          <div
            className={`notice ${message.kind === 'error' ? 'notice-error' : 'notice-success'} my-2 text-xs`}
          >
            {message.text}
          </div>
        )}

        <div className="space-y-4 pt-1">
          {/* Section 1: Invite Collaborator */}
          <form onSubmit={handleInvite} className="space-y-3">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Invite Collaborators
            </label>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="colleague@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex-1 text-xs"
              />
              <Select
                value={role}
                onValueChange={(val) => setRole((val as any) ?? 'viewer')}
              >
                <SelectTrigger className="w-28 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" size="sm" disabled={loading || !email}>
                <UserPlus size={14} /> Invite
              </Button>
            </div>
          </form>

          {inviteUrl && (
            <div className="rounded-md border bg-muted/40 p-2.5 text-xs">
              <div className="text-muted-foreground font-medium mb-1">
                Direct Invitation Link:
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate font-mono text-[11px] select-all bg-background px-2 py-1 rounded border">
                  {inviteUrl}
                </code>
                <Button
                  variant="outline"
                  size="icon-xs"
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(inviteUrl)
                  }}
                  title="Copy link"
                >
                  <Copy size={13} />
                </Button>
              </div>
            </div>
          )}

          {/* Section 2: AI Agent Connect */}
          <div className="rounded-lg border border-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-950/20 p-3 text-xs">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 font-medium text-indigo-700 dark:text-indigo-300">
                <Sparkles size={14} />
                <span>AI Agent Access</span>
              </div>
              <Button
                variant="outline"
                size="xs"
                type="button"
                onClick={generateAgentKey}
                disabled={loading}
                className="text-[11px] h-7"
              >
                <KeyRound size={12} />
                <span>New Agent Token</span>
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Equip Claude, Cursor, or your custom agents to autonomously create
              and update artifacts in this space.
            </p>

            {createdKey && (
              <div className="mt-2 p-2 rounded bg-background border flex items-center gap-2">
                <code className="flex-1 font-mono text-[11px] text-indigo-600 dark:text-indigo-400 truncate">
                  {createdKey}
                </code>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => {
                    void navigator.clipboard.writeText(createdKey)
                    setCopiedKey(true)
                    setTimeout(() => setCopiedKey(false), 2000)
                  }}
                >
                  {copiedKey ? (
                    <Check size={13} className="text-emerald-500" />
                  ) : (
                    <Copy size={13} />
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Section 3: Space Quick Link */}
          <div className="pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
            <span>Space URL:</span>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={copySpaceLink}
              className="h-7 text-xs"
            >
              {copiedLink ? (
                <Check size={13} className="text-emerald-500 mr-1" />
              ) : (
                <Copy size={13} className="mr-1" />
              )}
              {copiedLink ? 'Copied' : 'Copy Space URL'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

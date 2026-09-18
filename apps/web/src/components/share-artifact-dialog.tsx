import { useState } from 'react'
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Share2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import type { Artifact } from '@otterware/contracts'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'

export interface ShareArtifactDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  artifact: Artifact | null
}

export function ShareArtifactDialog({
  open,
  onOpenChange,
  artifact,
}: ShareArtifactDialogProps) {
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [copiedPrompt, setCopiedPrompt] = useState(false)

  if (!artifact) return null

  const artifactUrl = artifact.url
  const agentPrompt = `Edit my Otterware artifact at ${artifact.url}. Read the current version first and publish a new immutable version with the Otterware CLI.`

  function copyUrl() {
    void navigator.clipboard.writeText(artifactUrl)
    setCopiedUrl(true)
    setTimeout(() => setCopiedUrl(false), 2000)
  }

  function copyPrompt() {
    void navigator.clipboard.writeText(agentPrompt)
    setCopiedPrompt(true)
    setTimeout(() => setCopiedPrompt(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="share-artifact-modal max-w-md">
        <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
          <Share2 size={16} />
          <span>Share "{artifact.title}"</span>
        </DialogTitle>
        <DialogDescription className="text-xs">
          Share this artifact with collaborators or give instructions to your AI
          agent.
        </DialogDescription>

        <div className="space-y-3 pt-2 text-xs">
          {/* Share Link */}
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Artifact Link
            </label>
            <div className="flex items-center gap-1.5">
              <input
                readOnly
                value={artifactUrl}
                className="flex-1 bg-muted/50 border rounded px-2.5 py-1.5 font-mono text-[11px] text-foreground select-all outline-none"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={copyUrl}
                className="h-8"
              >
                {copiedUrl ? (
                  <Check size={13} className="text-emerald-500" />
                ) : (
                  <Copy size={13} />
                )}
                <span className="ml-1">{copiedUrl ? 'Copied' : 'Copy'}</span>
              </Button>
            </div>
          </div>

          {/* AI Collaboration Prompt */}
          <div className="rounded-lg border border-purple-500/20 bg-purple-50/50 dark:bg-purple-950/20 p-3">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5 font-medium text-purple-700 dark:text-purple-300">
                <Sparkles size={13} />
                <span>AI Prompt for Agent Collaboration</span>
              </div>
              <Button
                variant="ghost"
                size="xs"
                onClick={copyPrompt}
                className="h-6 text-[11px]"
              >
                {copiedPrompt ? (
                  <Check size={12} className="text-emerald-500 mr-1" />
                ) : (
                  <Copy size={12} className="mr-1" />
                )}
                {copiedPrompt ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <p className="font-mono text-[11px] bg-background/80 p-2 rounded border leading-relaxed text-muted-foreground select-all">
              {agentPrompt}
            </p>
          </div>

          {/* Sharing Status & Download */}
          <div className="flex items-center justify-between pt-2 border-t text-muted-foreground text-[11px]">
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck size={13} />
              <span>Space Members Only</span>
            </span>
            <div className="flex items-center gap-2">
              <a
                href={`/api/v1/artifacts/${encodeURIComponent(artifact.id)}/download`}
                download
                className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
              >
                <Download size={13} />
                <span>Download Bundle</span>
              </a>
              <span>·</span>
              <a
                href={artifactUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
              >
                <ExternalLink size={13} />
                <span>Open in Tab</span>
              </a>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

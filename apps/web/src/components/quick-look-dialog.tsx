import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  Bot,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileCode,
  FileSpreadsheet,
  FileText,
  User,
  X,
} from 'lucide-react'
import type { Artifact } from '@otterware/contracts'
import { formatDate } from '#/lib/api'
import {
  formatBytes,
  getArtifactFormat,
  isAgentActor,
  relativeTime,
} from '#/lib/artifact-helpers'
import { Button } from '@/components/ui/button'

export interface QuickLookDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  artifact: Artifact | null
  organizationSlug: string
  onNext?: () => void
  onPrev?: () => void
  hasNext?: boolean
  hasPrev?: boolean
}

export function QuickLookDialog({
  open,
  onOpenChange,
  artifact,
  organizationSlug,
  onNext,
  onPrev,
  hasNext = false,
  hasPrev = false,
}: QuickLookDialogProps) {
  const [thumbError, setThumbError] = useState(false)

  // Reset error when artifact changes
  useEffect(() => {
    setThumbError(false)
  }, [artifact?.id])

  // Handle global keyboard shortcuts when Quick Look is open
  useEffect(() => {
    if (!open) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === ' ' || event.key === 'Spacebar') {
        // Spacebar toggles Quick Look closed
        event.preventDefault()
        onOpenChange(false)
      } else if (event.key === 'ArrowRight') {
        if (hasNext && onNext) {
          event.preventDefault()
          onNext()
        }
      } else if (event.key === 'ArrowLeft') {
        if (hasPrev && onPrev) {
          event.preventDefault()
          onPrev()
        }
      } else if (event.key === 'Escape') {
        event.preventDefault()
        onOpenChange(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, hasNext, hasPrev, onNext, onPrev, onOpenChange])

  if (!open || !artifact) return null

  const format = getArtifactFormat(artifact.currentVersion?.entryPath)
  const isAgent = isAgentActor(artifact.currentVersion?.createdBy)
  const creatorName =
    artifact.currentVersion?.createdBy?.name ??
    (isAgent ? 'AI Agent' : 'Member')
  const versionNum = artifact.currentVersion?.number ?? 1
  const byteSize = artifact.currentVersion?.byteSize ?? 0
  const fileCount = artifact.currentVersion?.fileCount ?? 1

  return (
    <div
      className="quicklook-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={`Quick Look: ${artifact.title}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false)
      }}
    >
      <div className="quicklook-window">
        {/* Titlebar with Finder aesthetic */}
        <div className="quicklook-titlebar">
          <div className="quicklook-controls">
            <button
              type="button"
              className="quicklook-close-dot"
              aria-label="Close Quick Look"
              onClick={() => onOpenChange(false)}
            >
              <X size={10} />
            </button>
            <div className="quicklook-nav-buttons">
              <Button
                variant="ghost"
                size="icon-xs"
                type="button"
                disabled={!hasPrev}
                onClick={onPrev}
                aria-label="Previous artifact"
              >
                <ChevronLeft size={14} />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                type="button"
                disabled={!hasNext}
                onClick={onNext}
                aria-label="Next artifact"
              >
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>

          <div className="quicklook-title">
            <span className={`quicklook-format-tag ${format.pillClass}`}>
              {format.badge}
            </span>
            <strong className="truncate">{artifact.title}</strong>
            <span className="quicklook-version">v{versionNum}</span>
          </div>

          <div className="quicklook-actions">
            <Link
              to="/$organizationSlug/a/$slug"
              params={{
                organizationSlug,
                slug: artifact.slug,
              }}
              className="quicklook-open-button"
              onClick={() => onOpenChange(false)}
            >
              <span>Open</span>
              <ExternalLink size={13} />
            </Link>
          </div>
        </div>

        {/* Preview Viewport */}
        <div className="quicklook-viewport">
          {artifact.thumbnailUrl && !thumbError ? (
            <div className="quicklook-image-container">
              <img
                src={artifact.thumbnailUrl}
                alt={artifact.title}
                onError={() => setThumbError(true)}
                className="quicklook-image"
              />
            </div>
          ) : (
            <div className="quicklook-fallback">
              <div className="quicklook-fallback-icon">
                {format.type === 'sheet' && <FileSpreadsheet size={54} />}
                {format.type === 'html' && <FileCode size={54} />}
                {format.type === 'doc' && <FileText size={54} />}
                {(format.type === 'data' ||
                  format.type === 'image' ||
                  format.type === 'generic') && <FileCode size={54} />}
              </div>
              <h3>{artifact.title}</h3>
              <p className="quicklook-fallback-slug">{artifact.slug}</p>
              {artifact.description && (
                <p className="quicklook-fallback-desc">
                  {artifact.description}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Finder Info Footer */}
        <div className="quicklook-footer">
          <div className="quicklook-author-collab">
            {isAgent ? (
              <span className="actor-badge actor-agent">
                <Bot size={13} />
                <span>{creatorName}</span>
                <span className="actor-agent-label">AI Agent</span>
              </span>
            ) : (
              <span className="actor-badge actor-human">
                <User size={13} />
                <span>{creatorName}</span>
              </span>
            )}
            {artifact.currentVersion?.label && (
              <span className="quicklook-version-label">
                "{artifact.currentVersion.label}"
              </span>
            )}
          </div>

          <div className="quicklook-meta-details">
            <span>{formatBytes(byteSize)}</span>
            <span className="dot-sep">·</span>
            <span>
              {fileCount} {fileCount === 1 ? 'file' : 'files'}
            </span>
            <span className="dot-sep">·</span>
            <span title={formatDate(artifact.updatedAt)}>
              {relativeTime(artifact.updatedAt)}
            </span>
          </div>

          <div className="quicklook-hints">
            <kbd>Space</kbd> close <kbd>←</kbd> <kbd>→</kbd> browse
          </div>
        </div>
      </div>
    </div>
  )
}

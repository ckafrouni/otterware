import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  Bot,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileCode,
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
        {/* Titlebar with Minimalist Linear Header */}
        <div className="quicklook-titlebar">
          <div className="quicklook-controls">
            <Button
              variant="ghost"
              size="icon-xs"
              className="quicklook-close-btn"
              aria-label="Close Quick Look"
              onClick={() => onOpenChange(false)}
            >
              <X size={14} />
            </Button>
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
          ) : format.type === 'sheet' ? (
            <div className="quicklook-sheet-canvas">
              <div className="sheet-preview-formula">
                <span className="sheet-fx">fx</span>
                <span className="sheet-formula-text">=SUM(B2:E2)</span>
              </div>
              <div className="sheet-preview-grid">
                <div className="sheet-row sheet-header-row">
                  <div className="sheet-cell sheet-corner" />
                  <div className="sheet-cell sheet-col-head">A</div>
                  <div className="sheet-cell sheet-col-head">B</div>
                  <div className="sheet-cell sheet-col-head">C</div>
                  <div className="sheet-cell sheet-col-head">D</div>
                  <div className="sheet-cell sheet-col-head">E</div>
                </div>
                <div className="sheet-row">
                  <div className="sheet-cell sheet-row-head">1</div>
                  <div className="sheet-cell font-medium">Metric</div>
                  <div className="sheet-cell font-mono">Q1</div>
                  <div className="sheet-cell font-mono">Q2</div>
                  <div className="sheet-cell font-mono">Q3</div>
                  <div className="sheet-cell font-mono">Q4</div>
                </div>
                <div className="sheet-row">
                  <div className="sheet-cell sheet-row-head">2</div>
                  <div className="sheet-cell">Revenue</div>
                  <div className="sheet-cell font-mono text-emerald-500">
                    $480k
                  </div>
                  <div className="sheet-cell font-mono text-emerald-500">
                    $620k
                  </div>
                  <div className="sheet-cell font-mono text-emerald-500">
                    $850k
                  </div>
                  <div className="sheet-cell font-mono text-emerald-500">
                    $1,120k
                  </div>
                </div>
                <div className="sheet-row">
                  <div className="sheet-cell sheet-row-head">3</div>
                  <div className="sheet-cell">Gross Margin</div>
                  <div className="sheet-cell font-mono">64.2%</div>
                  <div className="sheet-cell font-mono">68.5%</div>
                  <div className="sheet-cell font-mono">72.1%</div>
                  <div className="sheet-cell font-mono">74.8%</div>
                </div>
                <div className="sheet-row">
                  <div className="sheet-cell sheet-row-head">4</div>
                  <div className="sheet-cell">Net Margin</div>
                  <div className="sheet-cell font-mono text-indigo-400">
                    18.4%
                  </div>
                  <div className="sheet-cell font-mono text-indigo-400">
                    22.1%
                  </div>
                  <div className="sheet-cell font-mono text-indigo-400">
                    27.5%
                  </div>
                  <div className="sheet-cell font-mono text-indigo-400">
                    31.2%
                  </div>
                </div>
              </div>
            </div>
          ) : format.type === 'html' ? (
            <div className="quicklook-app-canvas">
              <div className="app-preview-chrome">
                <span className="app-preview-dot" />
                <span className="app-preview-dot" />
                <span className="app-preview-dot" />
                <span className="app-preview-url truncate">
                  {artifact.slug}
                </span>
              </div>
              <div className="app-preview-canvas">
                <FileCode size={48} className="text-amber-500 mb-2" />
                <h3 className="text-base font-semibold text-foreground mb-1">
                  {artifact.title}
                </h3>
                <span className="text-xs text-muted-foreground font-mono">
                  {artifact.slug}
                </span>
              </div>
            </div>
          ) : (
            <div className="quicklook-doc-canvas">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                <FileText size={20} className="text-blue-500" />
                <h3 className="text-sm font-semibold text-foreground">
                  {artifact.title}
                </h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                {artifact.description ||
                  'Markdown documentation artifact created for review and team collaboration.'}
              </p>
              <div className="doc-preview-code text-xs font-mono text-muted-foreground">
                # {artifact.slug}
              </div>
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

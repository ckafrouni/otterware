import { useEffect, useRef } from 'react'
import {
  Archive,
  Bot,
  CircleDot,
  FileCode,
  FileSpreadsheet,
  FileText,
} from 'lucide-react'
import type { Artifact } from '@otterware/contracts'
import {
  getArtifactFormat,
  isAgentActor,
  relativeTime,
} from '#/lib/artifact-helpers'

export interface FinderFileListProps {
  artifacts: Artifact[]
  selectedArtifactId: string | null
  onSelectArtifact: (artifact: Artifact) => void
  onOpenArtifact: (artifact: Artifact) => void
  onQuickLook: (artifact: Artifact) => void
  status: 'active' | 'archived'
  onStatusChange: (status: 'active' | 'archived') => void
}

export function FinderFileList({
  artifacts,
  selectedArtifactId,
  onSelectArtifact,
  onOpenArtifact,
  onQuickLook,
  status,
  onStatusChange,
}: FinderFileListProps) {
  const listRef = useRef<HTMLDivElement>(null)

  // Arrow key navigation inside list
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (artifacts.length === 0) return
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return
      }

      const currentIndex = artifacts.findIndex(
        (a) => a.id === selectedArtifactId,
      )

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        const nextIndex =
          currentIndex < artifacts.length - 1 ? currentIndex + 1 : 0
        const nextArtifact = artifacts[nextIndex]
        if (nextArtifact) onSelectArtifact(nextArtifact)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        const prevIndex =
          currentIndex > 0 ? currentIndex - 1 : artifacts.length - 1
        const prevArtifact = artifacts[prevIndex]
        if (prevArtifact) onSelectArtifact(prevArtifact)
      } else if (e.key === 'Enter') {
        const currentArtifact =
          artifacts.find((a) => a.id === selectedArtifactId) ?? artifacts[0]
        if (currentArtifact) {
          e.preventDefault()
          onOpenArtifact(currentArtifact)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [artifacts, selectedArtifactId, onSelectArtifact, onOpenArtifact])

  return (
    <div className="finder-file-list-pane" ref={listRef}>
      {/* Sub-header with filter pills */}
      <div className="finder-file-list-header">
        <div className="finder-status-chips">
          <button
            type="button"
            className={`view-chip ${status === 'active' ? 'active' : ''}`}
            aria-pressed={status === 'active'}
            onClick={() => onStatusChange('active')}
          >
            <CircleDot size={12} />
            <span>Active</span>
          </button>
          <button
            type="button"
            className={`view-chip ${status === 'archived' ? 'active' : ''}`}
            aria-pressed={status === 'archived'}
            onClick={() => onStatusChange('archived')}
          >
            <Archive size={12} />
            <span>Archived</span>
          </button>
        </div>
        <span className="finder-file-count-label">
          {artifacts.length} {artifacts.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* Files list */}
      <div className="finder-file-items-scroll" role="listbox" tabIndex={0}>
        {artifacts.length === 0 ? (
          <div className="finder-file-empty-state">
            <p>No artifacts found.</p>
          </div>
        ) : (
          artifacts.map((artifact) => {
            const isSelected = selectedArtifactId === artifact.id
            const format = getArtifactFormat(artifact.currentVersion?.entryPath)
            const isAgent = isAgentActor(artifact.currentVersion?.createdBy)
            const creatorName =
              artifact.currentVersion?.createdBy?.name ??
              (isAgent ? 'AI Agent' : 'Member')

            return (
              <div
                key={artifact.id}
                role="option"
                aria-selected={isSelected}
                className={`finder-list-row ${isSelected ? 'is-selected' : ''}`}
                onClick={() => onSelectArtifact(artifact)}
                onDoubleClick={() => onOpenArtifact(artifact)}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Spacebar') {
                    e.preventDefault()
                    onQuickLook(artifact)
                  }
                }}
              >
                <div className="finder-row-icon">
                  {format.type === 'sheet' && (
                    <FileSpreadsheet size={16} className="text-emerald-500" />
                  )}
                  {format.type === 'html' && (
                    <FileCode size={16} className="text-amber-500" />
                  )}
                  {format.type === 'doc' && (
                    <FileText size={16} className="text-blue-500" />
                  )}
                  {format.type !== 'sheet' &&
                    format.type !== 'html' &&
                    format.type !== 'doc' && (
                      <FileCode size={16} className="text-muted-foreground" />
                    )}
                </div>

                <div className="finder-row-primary">
                  <span className="finder-row-title truncate">
                    {artifact.title}
                  </span>
                  <span className="finder-row-slug font-mono truncate">
                    {artifact.slug}
                  </span>
                </div>

                <div className="finder-row-meta">
                  {isAgent ? (
                    <span
                      className="finder-row-agent-pill"
                      title={`Created by AI Agent: ${creatorName}`}
                    >
                      <Bot size={11} />
                      <span>{creatorName}</span>
                    </span>
                  ) : null}
                  <span className="finder-row-version">
                    v{artifact.currentVersion?.number ?? 1}
                  </span>
                  <span className="finder-row-date">
                    {relativeTime(artifact.updatedAt)}
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

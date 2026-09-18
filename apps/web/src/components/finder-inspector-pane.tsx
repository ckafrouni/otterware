import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  Archive,
  Bot,
  CloudDownload,
  Copy,
  ExternalLink,
  Eye,
  FileCode,
  FileText,
  RotateCcw,
  Share2,
  Sparkles,
  Trash2,
  User,
} from 'lucide-react'
import type { Artifact } from '@otterware/contracts'
import { formatDate } from '#/lib/api'
import {
  formatBytes,
  getArtifactFormat,
  isAgentActor,
} from '#/lib/artifact-helpers'
import { Button } from '@/components/ui/button'

export interface FinderInspectorPaneProps {
  artifact: Artifact | null
  organizationSlug: string
  onQuickLook: (artifact: Artifact) => void
  onShare: (artifact: Artifact) => void
  onChangeArchived?: (artifact: Artifact) => void
  onDelete?: (artifact: Artifact) => void
  isOwner?: boolean
}

export function FinderInspectorPane({
  artifact,
  organizationSlug,
  onQuickLook,
  onShare,
  onChangeArchived,
  onDelete,
  isOwner = false,
}: FinderInspectorPaneProps) {
  const [copiedPrompt, setCopiedPrompt] = useState(false)

  if (!artifact) {
    return (
      <aside className="finder-preview-panel finder-preview-empty">
        <div className="finder-empty-state">
          <p>Select an item to see its preview and details.</p>
        </div>
      </aside>
    )
  }

  const format = getArtifactFormat(artifact.currentVersion?.entryPath)
  const isAgent = isAgentActor(artifact.currentVersion?.createdBy)
  const creatorName =
    artifact.currentVersion?.createdBy?.name ??
    (isAgent ? 'Claude Agent' : 'Member')
  const byteSize = artifact.currentVersion?.byteSize ?? 0
  const fileCount = artifact.currentVersion?.fileCount ?? 1
  const versionNum = artifact.currentVersion?.number ?? 1

  const agentPrompt = `Edit my Otterware artifact at ${artifact.url}. Read the current version first and publish a new immutable version with the Otterware CLI.`

  function copyPrompt() {
    void navigator.clipboard.writeText(agentPrompt)
    setCopiedPrompt(true)
    setTimeout(() => setCopiedPrompt(false), 2000)
  }

  return (
    <aside
      className="finder-preview-panel"
      aria-label={`Preview: ${artifact.title}`}
    >
      <div className="finder-preview-scroll">
        {/* High-Craft Linear Document Stage */}
        <div
          className="finder-doc-stage"
          onClick={() => onQuickLook(artifact)}
          title="Click or press Spacebar to Quick Look"
        >
          {artifact.thumbnailUrl ? (
            <div className="finder-doc-sheet">
              <img
                src={artifact.thumbnailUrl}
                alt={artifact.title}
                className="finder-doc-image"
              />
              <div className="finder-doc-hover-overlay">
                <span className="finder-doc-quicklook-pill">
                  <Eye size={13} /> Quick Look
                </span>
              </div>
            </div>
          ) : format.type === 'sheet' ? (
            <div className="inspector-sheet-preview">
              <div className="sheet-preview-formula">
                <span className="sheet-fx">fx</span>
                <span className="sheet-formula-text">=SUM(B2:D2)</span>
              </div>
              <div className="sheet-preview-grid">
                <div className="sheet-row sheet-header-row">
                  <div className="sheet-cell sheet-corner" />
                  <div className="sheet-cell sheet-col-head">A</div>
                  <div className="sheet-cell sheet-col-head">B</div>
                  <div className="sheet-cell sheet-col-head">C</div>
                  <div className="sheet-cell sheet-col-head">D</div>
                </div>
                <div className="sheet-row">
                  <div className="sheet-cell sheet-row-head">1</div>
                  <div className="sheet-cell font-medium">Metric</div>
                  <div className="sheet-cell font-mono">Q1</div>
                  <div className="sheet-cell font-mono">Q2</div>
                  <div className="sheet-cell font-mono">Q3</div>
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
                </div>
                <div className="sheet-row">
                  <div className="sheet-cell sheet-row-head">3</div>
                  <div className="sheet-cell">Margin</div>
                  <div className="sheet-cell font-mono">64.2%</div>
                  <div className="sheet-cell font-mono">68.5%</div>
                  <div className="sheet-cell font-mono">72.1%</div>
                </div>
              </div>
              <div className="finder-doc-hover-overlay">
                <span className="finder-doc-quicklook-pill">
                  <Eye size={13} /> Quick Look
                </span>
              </div>
            </div>
          ) : format.type === 'html' ? (
            <div className="inspector-app-preview">
              <div className="app-preview-chrome">
                <span className="app-preview-dot" />
                <span className="app-preview-dot" />
                <span className="app-preview-dot" />
                <span className="app-preview-url truncate">
                  {artifact.slug}
                </span>
              </div>
              <div className="app-preview-canvas">
                <FileCode size={32} className="text-amber-500 mb-1" />
                <span className="text-xs font-semibold text-foreground truncate max-w-[200px]">
                  {artifact.title}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {artifact.slug}
                </span>
              </div>
              <div className="finder-doc-hover-overlay">
                <span className="finder-doc-quicklook-pill">
                  <Eye size={13} /> Quick Look
                </span>
              </div>
            </div>
          ) : (
            <div className="inspector-doc-preview">
              <div className="doc-preview-content">
                <div className="flex items-center gap-2 mb-2">
                  <FileText size={18} className="text-blue-500" />
                  <span className="text-xs font-semibold text-foreground truncate">
                    {artifact.title}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed mb-2">
                  {artifact.description ||
                    'Markdown documentation artifact created for review and team collaboration.'}
                </p>
                <div className="doc-preview-code font-mono text-[10px] text-muted-foreground">
                  # {artifact.slug}
                </div>
              </div>
              <div className="finder-doc-hover-overlay">
                <span className="finder-doc-quicklook-pill">
                  <Eye size={13} /> Quick Look
                </span>
              </div>
            </div>
          )}
        </div>

        {/* File Header Section */}
        <div className="finder-preview-header">
          <div className="finder-file-title-row">
            <h2
              className="finder-preview-filename truncate"
              title={artifact.title}
            >
              {artifact.title}
            </h2>
            <div className="finder-title-actions">
              <a
                href={`/api/v1/artifacts/${encodeURIComponent(artifact.id)}/download`}
                download
                className="finder-icon-btn"
                title="Download artifact bundle"
              >
                <CloudDownload size={16} />
              </a>
              <button
                type="button"
                className="finder-icon-btn"
                onClick={() => onShare(artifact)}
                title="Share artifact"
              >
                <Share2 size={16} />
              </button>
            </div>
          </div>
          <p className="finder-preview-subtitle">
            {format.label} — {formatBytes(byteSize)}
            {fileCount > 1 ? ` · ${fileCount} files` : ''}
          </p>
          {artifact.description && (
            <p className="finder-preview-description">{artifact.description}</p>
          )}
        </div>

        <div className="finder-preview-divider" />

        {/* Information Table (macOS 2-column tabular list) */}
        <div className="finder-info-section">
          <h3 className="finder-section-title">Information</h3>
          <dl className="finder-info-table">
            <div className="finder-info-row">
              <dt>Created</dt>
              <dd>{formatDate(artifact.createdAt)}</dd>
            </div>
            <div className="finder-info-row">
              <dt>Modified</dt>
              <dd>{formatDate(artifact.updatedAt)}</dd>
            </div>
            <div className="finder-info-row">
              <dt>Author</dt>
              <dd>
                {isAgent ? (
                  <span className="actor-badge actor-agent-compact">
                    <Bot size={12} />
                    <span>{creatorName}</span>
                    <span className="actor-agent-label">AI</span>
                  </span>
                ) : (
                  <span className="actor-badge actor-human-compact">
                    <User size={12} />
                    <span>{creatorName}</span>
                  </span>
                )}
              </dd>
            </div>
            <div className="finder-info-row">
              <dt>Version</dt>
              <dd>
                <span className="version-chip">v{versionNum}</span>
                {artifact.currentVersion?.label && (
                  <span className="finder-version-label truncate max-w-[140px]">
                    "{artifact.currentVersion.label}"
                  </span>
                )}
              </dd>
            </div>
            <div className="finder-info-row">
              <dt>Entry</dt>
              <dd>
                <code className="finder-mono-tag">
                  {artifact.currentVersion?.entryPath ?? 'index.html'}
                </code>
              </dd>
            </div>
            {artifact.currentVersion?.contentHash && (
              <div className="finder-info-row">
                <dt>SHA256</dt>
                <dd>
                  <code
                    className="finder-mono-tag"
                    title={artifact.currentVersion.contentHash}
                  >
                    {artifact.currentVersion.contentHash.slice(0, 10)}…
                  </code>
                </dd>
              </div>
            )}
          </dl>
        </div>

        <div className="finder-preview-divider" />

        {/* AI Agent Collaboration Prompt */}
        <div className="finder-agent-collab-box">
          <div className="finder-agent-box-header">
            <span className="flex items-center gap-1.5 font-medium text-purple-700 dark:text-purple-300">
              <Sparkles size={13} />
              <span>Collaborate with AI Agent</span>
            </span>
            <button
              type="button"
              className="text-xs text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
              onClick={copyPrompt}
            >
              <Copy size={11} />
              <span>{copiedPrompt ? 'Copied' : 'Copy Prompt'}</span>
            </button>
          </div>
          <p className="finder-agent-box-prompt">{agentPrompt}</p>
        </div>

        {/* Primary Action Buttons */}
        <div className="finder-preview-actions">
          <Link
            to="/$organizationSlug/a/$slug"
            params={{ organizationSlug, slug: artifact.slug }}
            className="finder-btn-primary"
          >
            <span>Open Full Artifact</span>
            <ExternalLink size={13} />
          </Link>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onQuickLook(artifact)}
            >
              <Eye size={13} /> Quick Look
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onShare(artifact)}
            >
              <Share2 size={13} /> Share
            </Button>
          </div>
          <div className="flex items-center justify-between pt-2 border-t text-xs">
            {onChangeArchived && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onChangeArchived(artifact)}
                className="text-muted-foreground h-7 px-2"
              >
                {artifact.archivedAt ? (
                  <>
                    <RotateCcw size={12} className="mr-1" /> Restore
                  </>
                ) : (
                  <>
                    <Archive size={12} className="mr-1" /> Archive
                  </>
                )}
              </Button>
            )}
            {onDelete && artifact.archivedAt && isOwner && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(artifact)}
                className="text-destructive h-7 px-2"
              >
                <Trash2 size={12} className="mr-1" /> Delete
              </Button>
            )}
          </div>
        </div>
      </div>
    </aside>
  )
}

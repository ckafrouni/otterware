import { useMemo, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  Archive,
  Bot,
  CircleDot,
  Copy,
  ExternalLink,
  Eye,
  FileBox,
  FileCode,
  FileSpreadsheet,
  FileText,
  Share2,
  User,
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

export type FinderCategory =
  | 'all'
  | 'active'
  | 'archived'
  | 'ai-agent'
  | 'human'
  | 'type-html'
  | 'type-sheet'
  | 'type-doc'

export interface FinderColumnViewProps {
  artifacts: Artifact[]
  organizationSlug: string
  selectedArtifactId: string | null
  onSelectArtifact: (artifact: Artifact) => void
  onQuickLook: (artifact: Artifact) => void
  onShare: (artifact: Artifact) => void
}

export function FinderColumnView({
  artifacts,
  organizationSlug,
  selectedArtifactId,
  onSelectArtifact,
  onQuickLook,
  onShare,
}: FinderColumnViewProps) {
  const [category, setCategory] = useState<FinderCategory>('all')
  const navigate = useNavigate()

  // Filter artifacts by category
  const filteredArtifacts = useMemo(() => {
    return artifacts.filter((artifact) => {
      if (category === 'all') return true
      if (category === 'active') return !artifact.archivedAt
      if (category === 'archived') return Boolean(artifact.archivedAt)
      if (category === 'ai-agent') {
        return isAgentActor(artifact.currentVersion?.createdBy)
      }
      if (category === 'human') {
        return !isAgentActor(artifact.currentVersion?.createdBy)
      }
      const format = getArtifactFormat(artifact.currentVersion?.entryPath)
      if (category === 'type-html') return format.type === 'html'
      if (category === 'type-sheet') return format.type === 'sheet'
      if (category === 'type-doc') return format.type === 'doc'
      return true
    })
  }, [artifacts, category])

  // Current active artifact
  const activeArtifact = useMemo(() => {
    if (!selectedArtifactId) return filteredArtifacts[0] ?? null
    return (
      filteredArtifacts.find((item) => item.id === selectedArtifactId) ??
      filteredArtifacts[0] ??
      null
    )
  }, [filteredArtifacts, selectedArtifactId])

  // Counts for each category
  const counts = useMemo(() => {
    return {
      all: artifacts.length,
      active: artifacts.filter((a) => !a.archivedAt).length,
      archived: artifacts.filter((a) => a.archivedAt).length,
      aiAgent: artifacts.filter((a) =>
        isAgentActor(a.currentVersion?.createdBy),
      ).length,
      human: artifacts.filter((a) => !isAgentActor(a.currentVersion?.createdBy))
        .length,
      html: artifacts.filter(
        (a) => getArtifactFormat(a.currentVersion?.entryPath).type === 'html',
      ).length,
      sheet: artifacts.filter(
        (a) => getArtifactFormat(a.currentVersion?.entryPath).type === 'sheet',
      ).length,
      doc: artifacts.filter(
        (a) => getArtifactFormat(a.currentVersion?.entryPath).type === 'doc',
      ).length,
    }
  }, [artifacts])

  return (
    <div className="finder-columns-container">
      {/* Column 1: Context & Collections / Folders */}
      <div className="finder-column finder-column-nav">
        <div className="finder-column-header">
          <span>Navigation</span>
        </div>
        <div className="finder-column-scroll">
          <div className="finder-nav-group">
            <span className="finder-group-title">Status</span>
            <button
              type="button"
              className={`finder-nav-item ${category === 'all' ? 'active' : ''}`}
              onClick={() => setCategory('all')}
            >
              <FileBox size={14} />
              <span className="finder-nav-label">All Artifacts</span>
              <span className="finder-nav-count">{counts.all}</span>
            </button>
            <button
              type="button"
              className={`finder-nav-item ${category === 'active' ? 'active' : ''}`}
              onClick={() => setCategory('active')}
            >
              <CircleDot size={14} />
              <span className="finder-nav-label">Active</span>
              <span className="finder-nav-count">{counts.active}</span>
            </button>
            <button
              type="button"
              className={`finder-nav-item ${category === 'archived' ? 'active' : ''}`}
              onClick={() => setCategory('archived')}
            >
              <Archive size={14} />
              <span className="finder-nav-label">Archived</span>
              <span className="finder-nav-count">{counts.archived}</span>
            </button>
          </div>

          <div className="finder-nav-group">
            <span className="finder-group-title">Collaboration</span>
            <button
              type="button"
              className={`finder-nav-item ${category === 'ai-agent' ? 'active' : ''}`}
              onClick={() => setCategory('ai-agent')}
            >
              <Bot size={14} className="text-purple-500" />
              <span className="finder-nav-label">AI Generated</span>
              <span className="finder-nav-count">{counts.aiAgent}</span>
            </button>
            <button
              type="button"
              className={`finder-nav-item ${category === 'human' ? 'active' : ''}`}
              onClick={() => setCategory('human')}
            >
              <User size={14} />
              <span className="finder-nav-label">Human Edited</span>
              <span className="finder-nav-count">{counts.human}</span>
            </button>
          </div>

          <div className="finder-nav-group">
            <span className="finder-group-title">Document Formats</span>
            <button
              type="button"
              className={`finder-nav-item ${category === 'type-html' ? 'active' : ''}`}
              onClick={() => setCategory('type-html')}
            >
              <FileCode size={14} className="text-amber-500" />
              <span className="finder-nav-label">Interactive Apps</span>
              <span className="finder-nav-count">{counts.html}</span>
            </button>
            <button
              type="button"
              className={`finder-nav-item ${category === 'type-sheet' ? 'active' : ''}`}
              onClick={() => setCategory('type-sheet')}
            >
              <FileSpreadsheet size={14} className="text-emerald-500" />
              <span className="finder-nav-label">Spreadsheets</span>
              <span className="finder-nav-count">{counts.sheet}</span>
            </button>
            <button
              type="button"
              className={`finder-nav-item ${category === 'type-doc' ? 'active' : ''}`}
              onClick={() => setCategory('type-doc')}
            >
              <FileText size={14} className="text-blue-500" />
              <span className="finder-nav-label">Documents</span>
              <span className="finder-nav-count">{counts.doc}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Column 2: Files / Artifacts in current context */}
      <div className="finder-column finder-column-files">
        <div className="finder-column-header">
          <span>Artifacts ({filteredArtifacts.length})</span>
        </div>
        <div className="finder-column-scroll">
          {filteredArtifacts.length === 0 ? (
            <div className="finder-empty-column">
              <p>No artifacts in this view</p>
            </div>
          ) : (
            filteredArtifacts.map((artifact) => {
              const isSelected = activeArtifact?.id === artifact.id
              const format = getArtifactFormat(
                artifact.currentVersion?.entryPath,
              )
              const isAgent = isAgentActor(artifact.currentVersion?.createdBy)
              return (
                <div
                  key={artifact.id}
                  className={`finder-file-row ${isSelected ? 'selected' : ''}`}
                  onClick={() => onSelectArtifact(artifact)}
                  onDoubleClick={() => {
                    void navigate({
                      to: '/$organizationSlug/a/$slug',
                      params: { organizationSlug, slug: artifact.slug },
                    })
                  }}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Spacebar') {
                      e.preventDefault()
                      onQuickLook(artifact)
                    } else if (e.key === 'Enter') {
                      e.preventDefault()
                      void navigate({
                        to: '/$organizationSlug/a/$slug',
                        params: { organizationSlug, slug: artifact.slug },
                      })
                    }
                  }}
                >
                  <div className="finder-file-icon">
                    {format.type === 'sheet' && (
                      <FileSpreadsheet size={15} className="text-emerald-500" />
                    )}
                    {format.type === 'html' && (
                      <FileCode size={15} className="text-amber-500" />
                    )}
                    {format.type === 'doc' && (
                      <FileText size={15} className="text-blue-500" />
                    )}
                    {(format.type === 'data' ||
                      format.type === 'image' ||
                      format.type === 'generic') && (
                      <FileBox size={15} className="text-muted-foreground" />
                    )}
                  </div>
                  <div className="finder-file-info">
                    <span className="finder-file-name truncate">
                      {artifact.title}
                    </span>
                    <span className="finder-file-slug truncate">
                      {artifact.slug}
                    </span>
                  </div>
                  <div className="finder-file-badge-group">
                    {isAgent ? (
                      <span
                        className="finder-agent-icon"
                        title="Created by AI Agent"
                      >
                        <Bot size={12} />
                      </span>
                    ) : null}
                    <span className="finder-version-pill">
                      v{artifact.currentVersion?.number ?? 1}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Column 3: Inspector / Quick Preview Column */}
      <div className="finder-column finder-column-inspector">
        <div className="finder-column-header">
          <span>Inspector</span>
        </div>
        <div className="finder-column-scroll">
          {activeArtifact ? (
            <InspectorPanel
              artifact={activeArtifact}
              organizationSlug={organizationSlug}
              onQuickLook={() => onQuickLook(activeArtifact)}
              onShare={() => onShare(activeArtifact)}
            />
          ) : (
            <div className="finder-empty-inspector">
              <p>Select an artifact to preview</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function InspectorPanel({
  artifact,
  organizationSlug,
  onQuickLook,
  onShare,
}: {
  artifact: Artifact
  organizationSlug: string
  onQuickLook: () => void
  onShare: () => void
}) {
  const format = getArtifactFormat(artifact.currentVersion?.entryPath)
  const isAgent = isAgentActor(artifact.currentVersion?.createdBy)
  const creatorName =
    artifact.currentVersion?.createdBy?.name ??
    (isAgent ? 'AI Agent' : 'Member')
  const byteSize = artifact.currentVersion?.byteSize ?? 0
  const fileCount = artifact.currentVersion?.fileCount ?? 1

  return (
    <div className="inspector-content">
      {/* Preview Card */}
      <div
        className="inspector-preview-box"
        onClick={onQuickLook}
        title="Click or tap Spacebar to Quick Look"
      >
        {artifact.thumbnailUrl ? (
          <img
            src={artifact.thumbnailUrl}
            alt={artifact.title}
            className="inspector-thumbnail"
          />
        ) : (
          <div className="inspector-placeholder-art">
            {format.type === 'sheet' && (
              <FileSpreadsheet size={42} className="text-emerald-500" />
            )}
            {format.type === 'html' && (
              <FileCode size={42} className="text-amber-500" />
            )}
            {format.type === 'doc' && (
              <FileText size={42} className="text-blue-500" />
            )}
            {(format.type === 'data' ||
              format.type === 'image' ||
              format.type === 'generic') && (
              <FileBox size={42} className="text-muted-foreground" />
            )}
            <span className="inspector-quicklook-hint">
              <Eye size={12} /> Quick Look
            </span>
          </div>
        )}
      </div>

      {/* Title & Description */}
      <div className="inspector-details">
        <div className="flex items-center gap-1.5 mb-1">
          <span
            className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${format.pillClass}`}
          >
            {format.badge}
          </span>
          <span className="text-[11px] font-mono text-muted-foreground">
            v{artifact.currentVersion?.number ?? 1}
          </span>
        </div>
        <h3 className="inspector-title">{artifact.title}</h3>
        <p className="inspector-slug font-mono">{artifact.slug}</p>
        {artifact.description && (
          <p className="inspector-desc">{artifact.description}</p>
        )}
      </div>

      {/* Collaboration Attribution */}
      <div className="inspector-collab-card">
        <div className="inspector-collab-header">
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
          <span
            className="text-[11px] text-muted-foreground"
            title={formatDate(artifact.updatedAt)}
          >
            {relativeTime(artifact.updatedAt)}
          </span>
        </div>
        {artifact.currentVersion?.label && (
          <div className="inspector-version-label font-mono text-[11px] text-muted-foreground mt-1.5">
            "{artifact.currentVersion.label}"
          </div>
        )}
      </div>

      {/* Metadata Table */}
      <div className="inspector-metadata-table">
        <div className="inspector-meta-row">
          <span>Entry file</span>
          <code className="truncate max-w-[140px]">
            {artifact.currentVersion?.entryPath ?? 'index.html'}
          </code>
        </div>
        <div className="inspector-meta-row">
          <span>Total size</span>
          <span>{formatBytes(byteSize)}</span>
        </div>
        <div className="inspector-meta-row">
          <span>Files</span>
          <span>{fileCount}</span>
        </div>
        <div className="inspector-meta-row">
          <span>Versions</span>
          <span>{artifact.versionCount}</span>
        </div>
        {artifact.currentVersion?.contentHash && (
          <div className="inspector-meta-row">
            <span>SHA256</span>
            <code
              className="text-[10px] truncate max-w-[120px]"
              title={artifact.currentVersion.contentHash}
            >
              {artifact.currentVersion.contentHash.slice(0, 10)}…
            </code>
          </div>
        )}
      </div>

      {/* Primary Action Buttons */}
      <div className="inspector-actions">
        <Link
          to="/$organizationSlug/a/$slug"
          params={{ organizationSlug, slug: artifact.slug }}
          className="inspector-btn-primary"
        >
          <span>Open Full Artifact</span>
          <ExternalLink size={13} />
        </Link>
        <div className="grid grid-cols-3 gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={onQuickLook}
            className="text-xs"
          >
            <Eye size={13} /> Quick Look
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onShare}
            className="text-xs"
          >
            <Share2 size={13} /> Share
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void navigator.clipboard.writeText(artifact.url)}
            className="text-xs"
          >
            <Copy size={13} /> Copy URL
          </Button>
        </div>
      </div>
    </div>
  )
}

import type { Actor } from '@otterware/contracts'

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || isNaN(bytes)) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function isAgentActor(actor: Actor | null | undefined): boolean {
  if (!actor) return false
  if (actor.type === 'api_key') return true
  const lower = actor.name.toLowerCase()
  return (
    lower.includes('agent') ||
    lower.includes('claude') ||
    lower.includes('codex') ||
    lower.includes('bot') ||
    lower.includes('gpt')
  )
}

export interface ArtifactFormatInfo {
  type: 'html' | 'sheet' | 'doc' | 'data' | 'image' | 'generic'
  label: string
  badge: string
  pillClass: string
}

export function getArtifactFormat(
  entryPath: string | null | undefined,
): ArtifactFormatInfo {
  const path = (entryPath ?? 'index.html').toLowerCase()
  if (path.endsWith('.html') || path.endsWith('.htm')) {
    return {
      type: 'html',
      label: 'Interactive App',
      badge: 'HTML',
      pillClass: 'format-pill-html',
    }
  }
  if (path.endsWith('.xlsx') || path.endsWith('.xls')) {
    return {
      type: 'sheet',
      label: 'Excel Workbook',
      badge: 'XLSX',
      pillClass: 'format-pill-sheet',
    }
  }
  if (path.endsWith('.csv') || path.endsWith('.tsv')) {
    return {
      type: 'sheet',
      label: 'Tabular Data',
      badge: 'CSV',
      pillClass: 'format-pill-csv',
    }
  }
  if (path.endsWith('.md') || path.endsWith('.markdown')) {
    return {
      type: 'doc',
      label: 'Document',
      badge: 'MD',
      pillClass: 'format-pill-doc',
    }
  }
  if (path.endsWith('.json')) {
    return {
      type: 'data',
      label: 'Data Payload',
      badge: 'JSON',
      pillClass: 'format-pill-data',
    }
  }
  if (
    path.endsWith('.png') ||
    path.endsWith('.jpg') ||
    path.endsWith('.jpeg') ||
    path.endsWith('.svg') ||
    path.endsWith('.webp')
  ) {
    return {
      type: 'image',
      label: 'Image',
      badge: 'IMG',
      pillClass: 'format-pill-image',
    }
  }
  return {
    type: 'generic',
    label: 'Artifact Bundle',
    badge: 'BUNDLE',
    pillClass: 'format-pill-generic',
  }
}

export function relativeTime(value: string | null | undefined): string {
  if (!value) return 'recently'
  const diff = Date.now() - new Date(value).getTime()
  const minutes = Math.round(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.round(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.round(months / 12)}y ago`
}

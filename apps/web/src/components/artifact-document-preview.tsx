import { useEffect, useState } from 'react'
import Papa from 'papaparse'
import { LoaderCircle } from 'lucide-react'
import { UniverEditor, type UniverSheet } from './univer-editor'

type GridValue = unknown

export function columnName(index: number): string {
  let value = index + 1
  let output = ''
  while (value > 0) {
    value -= 1
    output = String.fromCharCode(65 + (value % 26)) + output
    value = Math.floor(value / 26)
  }
  return output
}

interface ArtifactDocumentPreviewProps {
  contentType: string
  entryPath: string
  expectedCurrentVersion?: number | undefined
  onSheetChange?: ((sheet: string | undefined) => void) | undefined
  selectedSheet?: string | undefined
  slug: string
  version: number
}

function contentUrl(slug: string, version: number, path?: string): string {
  const query = new URLSearchParams({ version: String(version) })
  if (path) query.set('path', path)
  return `/api/v1/artifacts/${encodeURIComponent(slug)}/content?${query}`
}

async function loadContent(
  slug: string,
  version: number,
  as: 'text' | 'arrayBuffer',
): Promise<string | ArrayBuffer> {
  const response = await fetch(contentUrl(slug, version), {
    headers: { accept: '*/*' },
  })
  if (!response.ok)
    throw new Error(`Could not load document (${response.status}).`)
  return as === 'text' ? response.text() : response.arrayBuffer()
}

export function ArtifactDocumentPreview({
  contentType,
  entryPath,
  expectedCurrentVersion,
  onSheetChange,
  selectedSheet: selectedSheetName,
  slug,
  version,
}: ArtifactDocumentPreviewProps) {
  const [markdown, setMarkdown] = useState<string | null>(null)
  const [sheets, setSheets] = useState<UniverSheet[]>([])
  const [error, setError] = useState<string | null>(null)
  const normalizedType = contentType.split(';')[0]?.trim().toLowerCase() ?? ''
  const extension = entryPath.split('.').pop()?.toLowerCase()
  const markdownDocument =
    normalizedType === 'text/markdown' ||
    normalizedType === 'text/plain' ||
    extension === 'md' ||
    extension === 'markdown' ||
    extension === 'txt'
  const csvDocument =
    normalizedType === 'text/csv' || extension === 'csv' || extension === 'tsv'
  const workbook =
    normalizedType ===
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    extension === 'xlsx'

  useEffect(() => {
    let active = true
    setMarkdown(null)
    setSheets([])
    setError(null)

    if (markdownDocument || csvDocument) {
      loadContent(slug, version, 'text')
        .then((value) => {
          if (!active) return
          const text = value as string
          if (markdownDocument) {
            setMarkdown(text)
            return
          }
          const parsed = Papa.parse<string[]>(text, {
            delimiter: extension === 'tsv' ? '\t' : '',
            skipEmptyLines: false,
          })
          if (parsed.errors.length && !parsed.data.length) {
            throw new Error(
              parsed.errors[0]?.message ?? 'Could not parse spreadsheet.',
            )
          }
          setSheets([{ sheet: entryPath, data: parsed.data }])
        })
        .catch((reason: unknown) => {
          if (active)
            setError(reason instanceof Error ? reason.message : String(reason))
        })
    } else if (workbook) {
      loadContent(slug, version, 'arrayBuffer')
        .then(async (value) => {
          if (!active) return
          const XLSX = await import('@e965/xlsx')
          const parsed = XLSX.read(value as ArrayBuffer, {
            type: 'array',
            cellDates: true,
          })
          setSheets(
            parsed.SheetNames.map((sheet) => ({
              sheet,
              data: XLSX.utils.sheet_to_json<GridValue[]>(
                parsed.Sheets[sheet]!,
                { header: 1, defval: null, raw: false },
              ),
            })),
          )
        })
        .catch((reason: unknown) => {
          if (active)
            setError(reason instanceof Error ? reason.message : String(reason))
        })
    }

    return () => {
      active = false
    }
  }, [
    csvDocument,
    entryPath,
    extension,
    markdownDocument,
    slug,
    version,
    workbook,
  ])

  if (error) return <div className="viewer-message error-panel">{error}</div>
  if (markdownDocument && markdown !== null) {
    return (
      <UniverEditor
        entryPath={entryPath}
        expectedCurrentVersion={expectedCurrentVersion ?? version}
        kind="document"
        slug={slug}
        text={markdown}
      />
    )
  }
  if ((csvDocument || workbook) && sheets.length) {
    return (
      <UniverEditor
        entryPath={entryPath}
        expectedCurrentVersion={expectedCurrentVersion ?? version}
        kind="spreadsheet"
        onSheetChange={onSheetChange}
        selectedSheet={selectedSheetName}
        sheets={sheets}
        slug={slug}
      />
    )
  }
  return (
    <div className="viewer-message document-loading">
      <LoaderCircle size={18} className="spin" /> Loading document…
    </div>
  )
}

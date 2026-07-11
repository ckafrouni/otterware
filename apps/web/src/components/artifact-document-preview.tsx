import { useEffect, useMemo, useState } from 'react'
import Papa from 'papaparse'
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { FileSpreadsheet, LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

const MAX_ROWS = 2_000
const MAX_COLUMNS = 100

type GridValue = unknown

interface DocumentSheet {
  sheet: string
  data: GridValue[][]
}

interface ArtifactDocumentPreviewProps {
  contentType: string
  entryPath: string
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

function displayCell(value: GridValue): string {
  if (value == null) return ''
  if (value instanceof Date) return value.toLocaleString()
  return String(value)
}

function SpreadsheetGrid({ rows }: { rows: GridValue[][] }) {
  const columnCount = Math.min(
    MAX_COLUMNS,
    rows.reduce((maximum, row) => Math.max(maximum, row.length), 0),
  )
  const visibleRows = rows.slice(0, MAX_ROWS)
  const truncated =
    rows.length > MAX_ROWS || rows.some((row) => row.length > MAX_COLUMNS)

  if (!rows.length || !columnCount) {
    return <div className="document-empty">This spreadsheet is empty.</div>
  }

  return (
    <div className="spreadsheet-shell">
      {truncated && (
        <div className="spreadsheet-notice">
          Previewing the first {MAX_ROWS.toLocaleString()} rows and{' '}
          {MAX_COLUMNS} columns.
        </div>
      )}
      <div className="spreadsheet-scroll">
        <table className="spreadsheet-grid">
          <thead>
            <tr>
              <th className="spreadsheet-corner" aria-label="Row number" />
              {Array.from({ length: columnCount }, (_, index) => (
                <th key={index}>{columnName(index)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <th>{rowIndex + 1}</th>
                {Array.from({ length: columnCount }, (_, columnIndex) => (
                  <td key={columnIndex} title={displayCell(row[columnIndex])}>
                    {displayCell(row[columnIndex])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

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

export function ArtifactDocumentPreview({
  contentType,
  entryPath,
  slug,
  version,
}: ArtifactDocumentPreviewProps) {
  const [markdown, setMarkdown] = useState<string | null>(null)
  const [sheets, setSheets] = useState<DocumentSheet[]>([])
  const [activeSheet, setActiveSheet] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const normalizedType = contentType.split(';')[0]?.trim().toLowerCase() ?? ''
  const extension = entryPath.split('.').pop()?.toLowerCase()
  const markdownDocument =
    normalizedType === 'text/markdown' ||
    extension === 'md' ||
    extension === 'markdown'
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
    setActiveSheet(0)
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

  const selectedSheet = useMemo(
    () => sheets[activeSheet],
    [activeSheet, sheets],
  )
  const transformMarkdownUrl = (url: string) => {
    if (url.startsWith('#') || /^[a-z][a-z\d+.-]*:/i.test(url)) {
      return defaultUrlTransform(url)
    }
    const resolved = new URL(url, `https://artifact.local/${entryPath}`)
    return contentUrl(slug, version, resolved.pathname.slice(1))
  }

  if (error) return <div className="viewer-message error-panel">{error}</div>
  if (markdownDocument && markdown !== null) {
    return (
      <article className="markdown-preview">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          urlTransform={transformMarkdownUrl}
        >
          {markdown}
        </ReactMarkdown>
      </article>
    )
  }
  if ((csvDocument || workbook) && selectedSheet) {
    return (
      <div className="workbook-preview">
        <div className="workbook-toolbar">
          <span>
            <FileSpreadsheet size={15} /> {entryPath}
          </span>
          {sheets.length > 1 && (
            <div
              className="workbook-tabs"
              role="tablist"
              aria-label="Workbook sheets"
            >
              {sheets.map((sheet, index) => (
                <Button
                  key={sheet.sheet}
                  size="xs"
                  variant={activeSheet === index ? 'secondary' : 'ghost'}
                  role="tab"
                  aria-selected={activeSheet === index}
                  onClick={() => setActiveSheet(index)}
                >
                  {sheet.sheet}
                </Button>
              ))}
            </div>
          )}
        </div>
        <SpreadsheetGrid rows={selectedSheet.data} />
      </div>
    )
  }
  return (
    <div className="viewer-message document-loading">
      <LoaderCircle size={18} className="spin" /> Loading document…
    </div>
  )
}

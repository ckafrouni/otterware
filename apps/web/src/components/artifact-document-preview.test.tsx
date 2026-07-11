// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ArtifactDocumentPreview,
  columnName,
} from './artifact-document-preview'

afterEach(() => vi.unstubAllGlobals())

describe('ArtifactDocumentPreview', () => {
  it('converts spreadsheet column indexes to labels', () => {
    expect(columnName(0)).toBe('A')
    expect(columnName(25)).toBe('Z')
    expect(columnName(26)).toBe('AA')
  })

  it('renders CSV content as a spreadsheet grid', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('Name,Total\nOtterware,42', {
          headers: { 'content-type': 'text/csv' },
        }),
      ),
    )

    render(
      <ArtifactDocumentPreview
        contentType="text/csv"
        entryPath="report.csv"
        slug="report"
        version={1}
      />,
    )

    expect(await screen.findByText('Otterware')).not.toBeNull()
    expect(screen.getByText('42')).not.toBeNull()
    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/artifacts/report/content?version=1',
      { headers: { accept: '*/*' } },
    )
  })

  it('renders GitHub-flavored Markdown', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            '# Roadmap\n\n- [x] CSV preview\n\n![Chart](images/chart.png)',
          ),
        ),
    )

    render(
      <ArtifactDocumentPreview
        contentType="text/markdown"
        entryPath="README.md"
        slug="roadmap"
        version={2}
      />,
    )

    expect(
      await screen.findByRole('heading', { name: 'Roadmap' }),
    ).not.toBeNull()
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(
      true,
    )
    expect(screen.getByRole('img', { name: 'Chart' }).getAttribute('src')).toBe(
      '/api/v1/artifacts/roadmap/content?version=2&path=images%2Fchart.png',
    )
  })
})

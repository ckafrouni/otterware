import { describe, expect, it } from 'vitest'
import { spreadsheetThumbnailHtml } from './thumbnails'

describe('spreadsheet thumbnail rendering', () => {
  it('renders a sheet grid and safely escapes cell values', () => {
    const html = spreadsheetThumbnailHtml([
      ['Name', 'Status'],
      ['OtterDrive <Admin>', 'Working'],
    ])

    expect(html).toContain('<th>A</th>')
    expect(html).toContain('<th>1</th>')
    expect(html).toContain('OtterDrive &lt;Admin&gt;')
    expect(html).not.toContain('OtterDrive <Admin>')
  })
})

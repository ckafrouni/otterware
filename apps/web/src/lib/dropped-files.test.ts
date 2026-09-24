import { describe, expect, it } from 'vitest'
import { readDroppedItems } from './dropped-files'

function fileEntry(name: string) {
  const file = new File([name], name)
  return {
    name,
    isFile: true,
    isDirectory: false,
    file: (resolve: (file: File) => void) => resolve(file),
  }
}

// Hands out children in batches, like Chromium's readEntries.
function directoryEntry(name: string, children: unknown[], batchSize = 2) {
  return {
    name,
    isFile: false,
    isDirectory: true,
    createReader: () => {
      let offset = 0
      return {
        readEntries: (resolve: (entries: unknown[]) => void) => {
          const batch = children.slice(offset, offset + batchSize)
          offset += batch.length
          resolve(batch)
        },
      }
    },
  }
}

function dataTransferOf(entries: unknown[], files: File[] = []) {
  return {
    items: entries.map((entry) => ({
      kind: 'file',
      webkitGetAsEntry: () => entry,
    })),
    files,
  } as unknown as DataTransfer
}

describe('readDroppedItems', () => {
  it('keeps each dropped file as its own item', async () => {
    const items = await readDroppedItems(
      dataTransferOf([fileEntry('report.pdf'), fileEntry('notes.md')]),
    )
    expect(
      items.map((item) => [item.name, item.files.map((file) => file.path)]),
    ).toEqual([
      ['report.pdf', ['report.pdf']],
      ['notes.md', ['notes.md']],
    ])
  })

  it('reads a folder tree across batches and skips OS clutter', async () => {
    const site = directoryEntry('site', [
      fileEntry('index.html'),
      fileEntry('.DS_Store'),
      directoryEntry('assets', [fileEntry('app.js'), fileEntry('app.css')]),
    ])
    const [item] = await readDroppedItems(dataTransferOf([site]))
    expect(item?.name).toBe('site')
    expect(item?.files.map((file) => file.path)).toEqual([
      'index.html',
      'assets/app.js',
      'assets/app.css',
    ])
  })

  it('drops empty folders', async () => {
    const items = await readDroppedItems(
      dataTransferOf([directoryEntry('empty', [])]),
    )
    expect(items).toEqual([])
  })

  it('falls back to plain files when entries are unavailable', async () => {
    const file = new File(['x'], 'photo.png')
    const items = await readDroppedItems(dataTransferOf([null], [file]))
    expect(items).toEqual([
      { name: 'photo.png', files: [{ file, path: 'photo.png' }] },
    ])
  })
})

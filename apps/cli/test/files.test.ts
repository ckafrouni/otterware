import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { discoverFiles, resolveEntryPath } from '../src/files'

const temporaryDirectories: string[] = []

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  )
})

describe('artifact file discovery', () => {
  it('walks a directory deterministically and hashes each file', async () => {
    const root = await mkdtemp(join(tmpdir(), 'otterware-cli-'))
    temporaryDirectories.push(root)
    await mkdir(join(root, 'assets'))
    await writeFile(join(root, 'index.html'), '<h1>Hello</h1>')
    await writeFile(join(root, 'assets', 'app.js'), 'console.log("hello")')

    const files = await discoverFiles(root)

    expect(files.map((file) => file.path)).toEqual([
      'assets/app.js',
      'index.html',
    ])
    expect(files.every((file) => file.sha256.length === 64)).toBe(true)
    expect(resolveEntryPath(files)).toBe('index.html')
  })

  it('requires an entry for multi-file non-HTML content', async () => {
    const root = await mkdtemp(join(tmpdir(), 'otterware-cli-'))
    temporaryDirectories.push(root)
    await writeFile(join(root, 'a.txt'), 'a')
    await writeFile(join(root, 'b.txt'), 'b')
    const files = await discoverFiles(root)

    expect(() => resolveEntryPath(files)).toThrow('No index.html')
    expect(resolveEntryPath(files, 'a.txt')).toBe('a.txt')
  })
})

import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repository = resolve(fileURLToPath(new URL('..', import.meta.url)))
const cli = resolve(repository, 'apps/cli/dist/index.mjs')
const legacy = resolve(
  process.env.LEGACY_OTTERWARE_SITE ??
    '/home/chris_kafrouni_zentio_io/.openclaw/workspace/otterware-site',
)
const registryPath = resolve(legacy, 'public/artifacts.json')

if (!process.env.OTTERWARE_TOKEN) {
  throw new Error('OTTERWARE_TOKEN is required')
}
if (!existsSync(cli)) {
  throw new Error('Build the CLI first with pnpm --dir apps/cli build')
}
if (!existsSync(registryPath)) {
  throw new Error(`Legacy registry not found: ${registryPath}`)
}

const registry = JSON.parse(readFileSync(registryPath, 'utf8'))

function run(args) {
  const result = spawnSync(process.execPath, [cli, '--json', ...args], {
    encoding: 'utf8',
    env: process.env,
  })
  if (result.status !== 0) {
    throw new Error(
      result.stderr || result.stdout || `Command failed: ${args.join(' ')}`,
    )
  }
  return JSON.parse(result.stdout)
}

for (const artifact of registry.artifacts) {
  const versions = [...artifact.versions].sort((a, b) => a.version - b.version)
  const first = versions.shift()
  if (!first) continue
  const firstSource = resolve(
    legacy,
    'public',
    first.entry.replace(/^\//, '').replace(/\/index\.html$/, ''),
  )
  const created = run([
    'artifacts',
    'create',
    firstSource,
    '--slug',
    artifact.slug,
    '--title',
    artifact.title,
    '--description',
    artifact.description ?? '',
    '--visibility',
    'organization',
    '--label',
    first.label ?? `Imported v${first.version}`,
  ])
  const id = created.data.artifact.id
  for (const version of versions) {
    const source = resolve(
      legacy,
      'public',
      version.entry.replace(/^\//, '').replace(/\/index\.html$/, ''),
    )
    run([
      'artifacts',
      'push',
      id,
      source,
      '--label',
      version.label ?? `Imported v${version.version}`,
      '--if-version',
      String(version.version - 1),
    ])
  }
  process.stdout.write(
    `Imported ${artifact.slug} (${artifact.versions.length} versions)\n`,
  )
}

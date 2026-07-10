import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { hashPassword } from 'better-auth/crypto'

const appDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const configPath = resolve(appDirectory, 'wrangler.jsonc')
const wrangler = resolve(
  appDirectory,
  'node_modules/.bin',
  process.platform === 'win32' ? 'wrangler.cmd' : 'wrangler',
)

function fail(message) {
  process.stderr.write(`${message}\n`)
  process.exit(1)
}

function sql(value) {
  return `'${String(value).replaceAll("'", "''")}'`
}

function runWrangler(args) {
  const result = spawnSync(wrangler, args, {
    cwd: appDirectory,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  if (result.status !== 0) fail(result.stderr || result.stdout)
  return result.stdout
}

async function readPassword(label) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    fail('Administrator seeding requires an interactive terminal.')
  }
  process.stdout.write(`${label}: `)
  const wasRaw = process.stdin.isRaw
  process.stdin.setRawMode(true)
  process.stdin.resume()

  return new Promise((resolvePassword, reject) => {
    let value = ''
    const finish = () => {
      process.stdin.off('data', onData)
      process.stdin.setRawMode(Boolean(wasRaw))
      process.stdin.pause()
      process.stdout.write('\n')
    }
    const onData = (chunk) => {
      for (const character of chunk.toString('utf8')) {
        if (character === '\u0003' || character === '\u0004') {
          finish()
          reject(new Error('Administrator seeding cancelled.'))
          return
        }
        if (character === '\r' || character === '\n') {
          finish()
          resolvePassword(value)
          return
        }
        if (character === '\u007f' || character === '\b') {
          value = value.slice(0, -1)
        } else {
          value += character
        }
      }
    }
    process.stdin.on('data', onData)
  })
}

const config = readFileSync(configPath, 'utf8')
const email = config.match(/"ADMIN_EMAIL"\s*:\s*"([^"]+)"/)?.[1]
if (!email) fail('ADMIN_EMAIL is missing from wrangler.jsonc.')

const nameIndex = process.argv.indexOf('--name')
const name = nameIndex === -1 ? 'Chris Kafrouni' : process.argv[nameIndex + 1]
if (!name?.trim()) fail('--name requires a non-empty value.')
const local = process.argv.includes('--local')
const remote = process.argv.includes('--remote')
if (local === remote) fail('Specify exactly one of --local or --remote.')
const databaseTarget = local ? '--local' : '--remote'

const existingResult = JSON.parse(
  runWrangler([
    'd1',
    'execute',
    'DB',
    databaseTarget,
    '--json',
    '--command',
    `SELECT id FROM user WHERE lower(email) = lower(${sql(email)}) LIMIT 1`,
  ]),
)
if (existingResult[0]?.results?.length) {
  fail(`Refusing to seed: ${email} already exists.`)
}

process.stdout.write(
  `Seeding ${email} as the ${remote ? 'production' : 'local'} administrator.\n`,
)
const password = await readPassword('Password')
const confirmation = await readPassword('Confirm password')
if (password !== confirmation) fail('Passwords do not match.')
if (password.length < 12 || password.length > 128) {
  fail('Password must contain between 12 and 128 characters.')
}

const userId = crypto.randomUUID()
const accountId = crypto.randomUUID()
const now = Date.now()
const passwordHash = await hashPassword(password)
const statement = `
BEGIN TRANSACTION;
INSERT INTO user
  (id, name, email, emailVerified, image, createdAt, updatedAt, role, banned)
VALUES
  (${sql(userId)}, ${sql(name.trim())}, ${sql(email.toLowerCase())}, 1, NULL, ${now}, ${now}, 'admin', 0);
INSERT INTO account
  (id, accountId, providerId, userId, password, createdAt, updatedAt)
VALUES
  (${sql(accountId)}, ${sql(userId)}, 'credential', ${sql(userId)}, ${sql(passwordHash)}, ${now}, ${now});
COMMIT;
`

const temporaryDirectory = mkdtempSync(resolve(tmpdir(), 'otterware-seed-'))
const sqlPath = resolve(temporaryDirectory, 'seed.sql')
try {
  writeFileSync(sqlPath, statement, { encoding: 'utf8', mode: 0o600 })
  runWrangler([
    'd1',
    'execute',
    'DB',
    databaseTarget,
    '--yes',
    '--file',
    sqlPath,
  ])
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true })
}

process.stdout.write(`Administrator seeded: ${email}\n`)

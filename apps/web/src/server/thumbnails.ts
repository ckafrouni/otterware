import puppeteer from '@cloudflare/puppeteer'
import { signContentGrant } from './content'
import type { Env } from './types'

async function launchBrowser(env: Env) {
  let lastError: unknown
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await puppeteer.launch(env.BROWSER)
    } catch (error) {
      lastError = error
      if (attempt < 2) await scheduler.wait((attempt + 1) * 5_000)
    }
  }
  throw lastError
}

export async function generateThumbnail(
  env: Env,
  artifactId: string,
  versionId: string,
  entryPath: string,
): Promise<string> {
  const token = await signContentGrant(env, {
    artifactId,
    versionId,
    entryPath,
  })
  const url = new URL(`/raw/session/${token}`, env.CONTENT_URL).toString()
  const browser = await launchBrowser(env)
  let screenshot: Uint8Array
  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1200, height: 750, deviceScaleFactor: 1 })
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 25_000 })
    screenshot = await page.screenshot({
      type: 'jpeg',
      quality: 72,
    })
  } catch (error) {
    throw new Error(
      `Browser Run screenshot failed: ${error instanceof Error ? error.message : String(error)}`,
    )
  } finally {
    await browser.close()
  }

  const r2Key = `previews/${artifactId}/${versionId}.jpg`
  await env.ARTIFACTS.put(r2Key, screenshot, {
    httpMetadata: { contentType: 'image/jpeg', cacheControl: 'private' },
  })
  await env.DB.prepare(
    'UPDATE artifact_version SET preview_r2_key = ? WHERE id = ? AND artifact_id = ?',
  )
    .bind(r2Key, versionId, artifactId)
    .run()
  return r2Key
}

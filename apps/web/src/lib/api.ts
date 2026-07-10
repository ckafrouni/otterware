import { apiErrorSchema } from '@otterware/contracts'

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('accept', 'application/json')
  if (init.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json')
  }
  const response = await fetch(path, { ...init, headers })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    const parsed = apiErrorSchema.safeParse(body)
    throw new Error(
      parsed.success
        ? parsed.data.error.message
        : `Request failed (${response.status})`,
    )
  }
  return (await response.json()) as T
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

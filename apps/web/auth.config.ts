import { env } from 'cloudflare:workers'
import { createAuth } from './src/server/auth'
import type { Env } from './src/server/types'

export const auth = createAuth(env as Env)

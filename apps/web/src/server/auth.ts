import { apiKey } from '@better-auth/api-key'
import { betterAuth } from 'better-auth'
import {
  admin as adminPlugin,
  bearer,
  deviceAuthorization,
  organization,
} from 'better-auth/plugins'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { authorizeNewUser, normalizeEmail } from './auth-policy'
import type { Env } from './types'
import {
  accessControl,
  adminRole,
  editorRole,
  ownerRole,
  viewerRole,
} from './permissions'

export function createAuth(env: Env) {
  const googleEnabled = Boolean(
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET,
  )
  const socialProviders =
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
          },
        }
      : {}

  return betterAuth({
    appName: 'Otterware',
    baseURL: env.APP_URL,
    basePath: '/api/auth',
    database: env.DB,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.APP_URL],
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 60,
        strategy: 'compact',
      },
    },
    socialProviders,
    emailAndPassword: {
      enabled: !googleEnabled,
      disableSignUp: googleEnabled,
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => ({
            data: {
              ...user,
              email: normalizeEmail(user.email),
              role: await authorizeNewUser(env, user.email),
            },
          }),
        },
      },
    },
    advanced: {
      cookiePrefix: 'otterware',
      database: { generateId: 'uuid' },
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: 'lax',
        secure: env.APP_URL.startsWith('https://'),
      },
    },
    plugins: [
      adminPlugin({ defaultRole: 'user', adminRoles: ['admin'] }),
      organization({
        ac: accessControl,
        roles: {
          owner: ownerRole,
          admin: adminRole,
          editor: editorRole,
          viewer: viewerRole,
        },
        creatorRole: 'owner',
        allowUserToCreateOrganization: (user) => user.role === 'admin',
        teams: { enabled: false },
      }),
      deviceAuthorization({
        verificationUri: '/device',
        validateClient: (clientId) => clientId === 'otterware-cli',
      }),
      bearer(),
      apiKey({
        configId: 'organization',
        references: 'organization',
        defaultPrefix: 'otw_',
        requireName: true,
        apiKeyHeaders: ['x-api-key'],
        rateLimit: {
          enabled: true,
          timeWindow: 60_000,
          maxRequests: 600,
        },
        permissions: {
          defaultPermissions: {
            artifact: ['create', 'read', 'update'],
          },
        },
      }),
      tanstackStartCookies(),
    ],
  })
}

export type OtterwareAuth = ReturnType<typeof createAuth>

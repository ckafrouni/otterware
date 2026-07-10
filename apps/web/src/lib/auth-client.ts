import { apiKeyClient } from '@better-auth/api-key/client'
import { createAuthClient } from 'better-auth/react'
import {
  deviceAuthorizationClient,
  organizationClient,
} from 'better-auth/client/plugins'
import {
  accessControl,
  adminRole,
  editorRole,
  ownerRole,
  viewerRole,
} from '#/server/permissions'

export const authClient = createAuthClient({
  plugins: [
    organizationClient({
      ac: accessControl,
      roles: {
        owner: ownerRole,
        admin: adminRole,
        editor: editorRole,
        viewer: viewerRole,
      },
    }),
    deviceAuthorizationClient(),
    apiKeyClient(),
  ],
})

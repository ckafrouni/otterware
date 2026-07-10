import { createAccessControl } from 'better-auth/plugins/access'
import {
  adminAc,
  defaultStatements,
  memberAc,
  ownerAc,
} from 'better-auth/plugins/organization/access'

const statements = {
  ...defaultStatements,
  artifact: ['create', 'read', 'update', 'archive'],
  apiKey: ['create', 'read', 'revoke'],
} as const

export const accessControl = createAccessControl(statements)

export const ownerRole = accessControl.newRole({
  ...ownerAc.statements,
  artifact: ['create', 'read', 'update', 'archive'],
  apiKey: ['create', 'read', 'revoke'],
})

export const adminRole = accessControl.newRole({
  ...adminAc.statements,
  artifact: ['create', 'read', 'update', 'archive'],
  apiKey: ['create', 'read', 'revoke'],
})

export const editorRole = accessControl.newRole({
  ...memberAc.statements,
  artifact: ['create', 'read', 'update', 'archive'],
  apiKey: ['read'],
})

export const viewerRole = accessControl.newRole({
  ...memberAc.statements,
  artifact: ['read'],
  apiKey: ['read'],
})

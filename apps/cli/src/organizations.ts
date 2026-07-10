import type { Command } from 'commander'
import pc from 'picocolors'
import { ApiClient } from './client'
import { getProfile, updateProfile } from './config'
import type { GlobalOptions } from './output'
import { printJson, success, table } from './output'

interface Organization {
  id: string
  name: string
  slug: string
  createdAt: string
}

function globals(command: Command): GlobalOptions {
  return command.optsWithGlobals<GlobalOptions>()
}

export function registerOrganizationCommands(program: Command): void {
  const organizations = program
    .command('organizations')
    .alias('orgs')
    .description('Manage organizations and the active workspace')

  organizations
    .command('list')
    .alias('ls')
    .action(async (_options: unknown, command: Command) => {
      const { profile } = await getProfile(globals(command).profile)
      const result = await new ApiClient(profile).get<Organization[]>(
        '/api/auth/organization/list',
      )
      if (globals(command).json) printJson({ data: result })
      else
        table(
          result.map((organization) => ({
            active: organization.id === profile.organizationId ? 'yes' : '',
            id: organization.id,
            slug: organization.slug,
            name: organization.name,
          })),
        )
    })

  organizations
    .command('create')
    .argument('<name>')
    .requiredOption('--slug <slug>')
    .action(
      async (name: string, options: { slug: string }, command: Command) => {
        const current = await getProfile(globals(command).profile)
        const organization = await new ApiClient(
          current.profile,
        ).post<Organization>('/api/auth/organization/create', {
          name,
          slug: options.slug,
        })
        await updateProfile(current.name, {
          organizationId: organization.id,
        })
        if (globals(command).json) printJson({ data: organization })
        else success(`Created and selected ${pc.bold(organization.name)}.`)
      },
    )

  organizations
    .command('use')
    .argument('<organization>', 'Organization ID')
    .action(
      async (organizationId: string, _options: unknown, command: Command) => {
        const current = await getProfile(globals(command).profile)
        const client = new ApiClient({ ...current.profile, organizationId })
        const me = await client.get<{ data: { organizationId: string } }>(
          '/api/v1/me',
        )
        if (me.data.organizationId !== organizationId) {
          throw new Error(
            'The selected organization was not accepted by the server.',
          )
        }
        await updateProfile(current.name, { organizationId })
        if (globals(command).json) printJson({ data: { organizationId } })
        else success(`Selected organization ${pc.bold(organizationId)}.`)
      },
    )
}

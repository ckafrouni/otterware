import { Command } from 'commander'
import { registerArtifactCommands } from './artifacts'
import { registerAuthCommands } from './auth'
import { registerOrganizationCommands } from './organizations'

const program = new Command()
  .name('otterware')
  .description('Build and collaborate with Otterware')
  .version('0.1.0', '-V, --cli-version', 'Show the CLI version')
  .option('--json', 'Emit machine-readable JSON')
  .option('--profile <name>', 'Use a named configuration profile')
  .showSuggestionAfterError()
  .showHelpAfterError()

registerAuthCommands(program)
registerOrganizationCommands(program)
registerArtifactCommands(program)

program.parseAsync().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  process.stderr.write(`Error: ${message}\n`)
  process.exitCode = 1
})

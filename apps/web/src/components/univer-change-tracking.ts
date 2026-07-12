interface UniverCommand {
  type?: number
}

// Univer classifies commands as COMMAND (0), OPERATION (1), or MUTATION (2).
// Only mutations change data that is persisted in the document snapshot.
const SNAPSHOT_MUTATION = 2

export function changesSnapshot(command: UniverCommand): boolean {
  return command.type === SNAPSHOT_MUTATION
}

/** commands.json */

export type CommandGroups = Record<string, CommandGroup>
export interface CommandGroup {
  name: string
  commands: {
    command: string
    description?: string
    perm?: string
    consoleOnly?: boolean
    hidePrefix?: boolean,
    args?: Record<string, {
      allowed_values?: string[]
    }>
    examples?: string[]
  }[]
}

export function parseType(type: string): ParamType {
  switch (type) {
    case "int":
    case "integer":
      type = "integer"
      break
    case "players":
      return "players"
    case "player":
      return "player"
    case "float":
      type = "decimal"
      break
    case "string":
      type = "text"
      break
    case "bool":
    case "boolean":
      type = "boolean"
      break
  }
  return type as ParamType
}

enum ParseNode {
  None,
  Type,
  DefaultValue
}

export interface ParsedCommand {
  name: string,
  params: ParamData[]
}

export type ParamType = "integer" | "decimal" | "text" | "boolean" | "player" | "players"
export interface ParamData {
  name: string,
  required?: boolean,
  type: ParamType,
  /** If defined and not required, the default value of param if not set */
  defaultValue?: any,
  /** If defined, lists all the allowed values */
  allowedValues?: string[]
}


export type ParameterOptions = Record<string, {
  allowed_values?: string[] | string
}>
/**
 * Given a command such as "sm_example <my_required:int> [my_opt:string], parses the command name, and a list of aguments
 * @param input
 * @param args optional record of parameters and their settings
 */
export function parseCommandString(input: string, args: ParameterOptions = {}): ParsedCommand {
  const params: ParamData[] = []
  const chars = input.trim().split('')

  let mode = ParseNode.None
  let lastChar: string | null = null, letters = "", type = "", defaultValue
  let ignore = false
  let command = ""

  for (const char of chars) {
    if (ignore) {
      ignore = false
      // Include it in 'command' part
      if (!lastChar) command += char
      continue
    }

    if (char === "\\") {
      ignore = true
      continue
    } if (char === '<') {
      lastChar = '>'
    } else if (char === '[') {
      lastChar = ']'
    } else if (char === lastChar) {
      const data: ParamData = {
        name: letters.replace(/_/, ' '),
        required: char === '>',
        type: parseType(type),
        defaultValue: defaultValue,
      }
      const argData = args[letters]
      if (argData) {
        if (argData.allowed_values) {
          if (Array.isArray(argData.allowed_values)) {
            data.allowedValues = argData.allowed_values
          } else {
            data.allowedValues = [argData.allowed_values]
          }
        }
      }
      params.push(data)

      lastChar = null
      letters = ''
      type = ""
      defaultValue = undefined
      if (mode == ParseNode.DefaultValue) defaultValue = null
      mode = ParseNode.None
    } else if (lastChar) {
      if (char == ':') {
        mode = ParseNode.Type
      } else if ((defaultValue == undefined) && char == '=') {
        mode = ParseNode.DefaultValue
        defaultValue = ""
      } else if (mode == ParseNode.Type) {
        type += char
      } else if (mode == ParseNode.DefaultValue) {
        defaultValue += char
      } else {
        letters += char
      }
    } else {
      // A arg char (< or [) was not detected, so add the bits to command until then
      command += char
    }
  }
  return {
    name: command.trim(),
    params
  }
}

export interface Command {
  name: string
  args: ParamData[],
  description?: string
  perm?: string
  consoleOnly: boolean
  hidePrefix: boolean
}
export function parseCommand(item: any) {
  if (!item.command) throw new Error('Command property is required')
  const result = parseCommandString(item.command, item.args)
  return {
    name: result.name,
    args: result.params,
    description: item.description,
    perm: item.perm,
    consoleOnly: !!item.consoleOnly,
    hidePrefix: !!item.hidePrefix
  }
}

export function formatParameters(cmd: { args: Record<string, any>, defaultValue?: any }) {
  let string = ""

  for (const [arg, data] of Object.entries(cmd.args)) {
    const tagType = data.required ? 'is-link' : 'is-secondary'
    let tooltip = ""
    if (data.type.length > 0)
      tooltip = `Accepts a(n) ${data.required ? '' : 'optional '}${data.type}.`
    let defaultValue = cmd.defaultValue || data.defaultValue
    if (defaultValue) {
      defaultValue = defaultValue.toString().replace(/"/g, '&quot;')
      tooltip += ` Default value is ${defaultValue}`
    }
    if (data.allowedValues) {
      if (Array.isArray(data.allowedValues))
        tooltip += `\nAllowed Values: ${data.allowedValues.join(", ")}`
      else
        tooltip += `\nAllowed Values: ${data.allowedValues.replace(/>=/, '≥').replace(/<=/, '≤')}`
    }
    if (tooltip.length > 0)
      tooltip = `data-tooltip="${tooltip}"`
    string += `<span class='tag ${tagType}' ${tooltip}>${arg}</span> `
  }

  return string
}

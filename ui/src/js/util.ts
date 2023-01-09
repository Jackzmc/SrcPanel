export function parseType(type: string) {
  switch(type) {
    case "int":
    case "integer":
        type = "integer"
        break
    case "players":
        return "one or more player targets"
    case "player":
        return "player target"
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
  return type + " value"
}

enum ParseNode {
  None,
  Type,
  DefaultValue
}

export function formatParameters({parameters, defaultValue, args}: any) {
  const chars = parameters.split('')
  let mode = ParseNode.None
  let lastChar = null, letters = "", string = "", type = ""


  for(const char of chars) {
    if(char === '<') {
      lastChar = '>'
    }else if(char === '[') {
      lastChar = ']'
    }else if(char === lastChar) {
      const isRequired = char === '>'
      if(mode == ParseNode.DefaultValue) defaultValue += '"'
      let tooltip = "";
      
      if(type.length > 0)
        tooltip = `Accepts a(n) ${isRequired?'':'optional '}${parseType(type)}.`
      if(defaultValue !== undefined && defaultValue !== null) {
        defaultValue = defaultValue.toString().replace(/"/g, '&quot;')
        tooltip += ` Default value is ${defaultValue}`
      }
      if(args && args[letters]) {
        if(args[letters].allowed_values)
          if(Array.isArray(args[letters].allowed_values))
            tooltip += `\nAllowed Values: ${args[letters].allowed_values.join(", ")}`
          else
            tooltip += `\nAllowed Values: ${args[letters].allowed_values.replace(/>=/,'≥').replace(/<=/,'≤')}`
      }
      if(tooltip.length > 0)
        tooltip = `data-tooltip="${tooltip}"`

      const tagType = isRequired ? 'is-link' : 'is-secondary'
      string += `<span class='tag ${tagType}' ${tooltip}>${letters.replace(/_/, ' ')}</span> `
      lastChar = null
      letters = ''
      tooltip = ""
      type = ""
      if(mode == ParseNode.DefaultValue) defaultValue = null
      mode = ParseNode.None
    } else if(lastChar)
      if(char == ':') {
        mode = ParseNode.Type
      } else if((defaultValue === undefined || defaultValue === null) && char == '=') {
        mode = ParseNode.DefaultValue
        defaultValue = "\""
      } else if(mode == ParseNode.Type) {
        type += char
      } else if(mode == ParseNode.DefaultValue) {
        defaultValue += char
      } else{
        letters += char
      }
    else
      string += char
  }
  return string
}

import { notify, NotificationsOptions } from "@kyvg/vue3-notification"
import { formatDuration, intervalToDuration } from "date-fns"

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

export async function request(url: RequestInfo, options?: RequestInit, errOptions: Partial<NotificationsOptions> = {}): Promise<Response|null> {
  try {
    const response = await fetch(url, options)
    if(response.ok) {
      return response
    } else if(response.headers.get("content-type")?.includes("application/json")) {
      const json = await response.json()
      notify({
        type: "error",
        text: json.message ?? json.error,
        ...errOptions
      })
      console.error(`${url} returned an error:\n${json}`)
    } else {
      const text = await response.text()
      notify({
        type: "error",
        text,
        ...errOptions
      })
      console.error(`${url} returned an error:\n${text}`)
    }
    return response
  } catch(err: any) {
    notify({
      type: "error",
      text: err.message,
    })
    console.error(`an error occurred accessing ${url}: ${err}`)
    return null
  }
}


/**
 * Gives a object that allows you to start a request with a configurable timeout and being able to abort it
 * @date 7/11/2023 - 9:20:14 AM
 *
 * @export
 * @param {RequestInfo} url The url
 * @param {number} timeout Milliseconds
 * @param {?RequestInit} [options]
 * @param {Partial<NotificationsOptions>} [errOptions={}]
 */
export function requestTimeout(url: RequestInfo, timeout: number, options?: RequestInit, errOptions: Partial<NotificationsOptions> = {}) {
  const controller = new AbortController()
  const start = () => {
    setTimeout(() => controller.abort(), timeout)
    return request(url, { signal: controller.signal, ...options}, errOptions)
  }
  return {
    controller,
    start
  }
}

export function formatDate(timestamp?: number, onlyDate = false) {
  const d = timestamp ? new Date(timestamp * 1000) : new Date();
  if(onlyDate) return d.toLocaleDateString()
  return d.toLocaleDateString() + " at " + d.toLocaleTimeString(undefined, {
    timeStyle: "short"
  });
}
export function getRelDate(timestamp: number) : string {
  const date = timestamp ? new Date(timestamp * 1000) : new Date();
  const secondsDiff = ((Date.now() - date.getTime()) / 1000);
  const dayDiff = Math.floor(secondsDiff / 86400);
  const monthsDiff = Math.round(dayDiff / 30)
  const yearsDiff = Math.round(monthsDiff / 12)
  if(yearsDiff > 0) return `${yearsDiff} year${yearsDiff == 1 ? "" : "s"} ago`
  if(monthsDiff > 0) return `${monthsDiff} month${monthsDiff == 1 ? "" : "s"} ago`
  if (isNaN(dayDiff) || dayDiff < 0 || dayDiff >= 31) return "<invalid date>"

  return dayDiff == 0 && (
    secondsDiff < 1 && "just now" || secondsDiff < 60 && `${Math.ceil(secondsDiff)} seconds ago` || secondsDiff < 120 && "1 minute ago" || secondsDiff < 3600 && Math.floor(secondsDiff / 60) + " minutes ago" || secondsDiff < 7200 && "1 hour ago" || secondsDiff < 86400 && Math.floor(secondsDiff / 3600) + " hours ago") || dayDiff == 1 && "yesterday" || dayDiff < 7 && dayDiff + " days ago" || dayDiff < 31 && Math.ceil(dayDiff / 7) + " weeks ago"
    || "Unknown"
}

export function getDuration(timestamp: number) {
  const date = timestamp ? new Date(timestamp * 1000) : new Date();
  const duration = intervalToDuration({
    start: date,
    end: new Date()
  })
  return formatDuration(duration)
}

export function convertSnakeToHuman(input: string) {
  return input.replace(/^_*(.)|_+(.)/g, (s, c, d) => c ? c.toUpperCase() : ' ' + d.toUpperCase())
}
const ADMINCHAT_REGEX = /triggered sm_say \(text (.*)\)/;
export function parseLog(log: any, history: {activators: any[], targets: any[] } = { activators: [], targets: [] }, debug = false) {
  log.timestampRaw = log.timestamp
  log.timestamp = formatDate(log.timestamp);
  log.client = {
    steamid: log.client,
    name: log.clientName || log.client,
    hasStats: !!log.clientName,
  };
  log.target = {
    steamid: log.target,
    name: log.targetName || log.target,
    hasStats: !!log.targetName,
  };
  if (
    log.type == "ACTION" &&
    log.client.steamid &&
    log.client.steamid.startsWith("STEAM_") &&
    !history.activators.some((c) => c.steamid == log.client.steamid)
  )
    history.activators.push(log.client);
  if (
    log.target.steamid &&
    log.target.steamid.startsWith("STEAM_") &&
    !history.targets.some((c) => c.steamid == log.target.steamid)
  )
    history.targets.push(log.target);

  // if (log.client.steamid && log.message && log.message[0] != " ") {
  //   log.message = " " + log.message;
  // }
  if (log.message === "[redacted]") log.redacted = true;

  if (!debug && log.message) {
    // log.message = log.message.replace(FULLNAME_REGEX, "");
    if (log.type === "ACTION") {
      const adminChatMatch = log.message.match(ADMINCHAT_REGEX);
      if (adminChatMatch) {
        log.message = `<span class='tag is-warning' data-tooltip='Message was sent in admin chat'>${adminChatMatch[1]}</span>`;
        log.type = "CHAT";
      }
    } else if (log.type === "CHAT") {
      log.message = `<span class='tag'>${log.message}</span>`;
    }
  }
  return log
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

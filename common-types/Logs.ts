export interface APILogData {
  /** All distinct servers in table */
  servers: string[],
  /** All years of data */
  years: Record<string, YearInfo>,
  /** The computed total of all year's count summed together. May be 0 until fullyLoaded */
  computedTotal?: number

  /** Is the data fully loaded? If false, only partial data is loaded, if true, a full load is completed
   */
  fullyLoaded: boolean
}

export interface YearInfo {
  /** The lowest ID of this year */
  minId: number,
  /** The highest ID of this year */
  maxId: number,
  /** The number of years for this row. May not be initialized yet if fullyLoaded false */
  count?: number,
  /** The milliseconds unix timestamp when data was fetched */
  fetchTime: number
}

export interface APILogQueryResult {
  /** The log entries */
  logs: LogEntry[],
  /** The time taken in milliseconds */
  timeTaken: number,
  /** The info about the selected year **/
  yearInfo?: YearInfo,

  counts: {
    /** The number of rows in query results */
    queryRows: number,
    /** The total number of rows to query in specific year */
  }
  /** Only avaible in development */
  raw?: any
}

export interface LogEntry {
  /** ID of log entry */
  id: number,
  /** When entry was created, milliseconds unix timestamp */
  timestamp: number,
  /** The server this was tagged with */
  server?: string,
  /** The type of entry */
  type?: string,
  /**
   * The client, may be steamid2 (STEAM_#:#:####), or any arbitary string that performed action
   * If undefined, may be server or console, or unknown
   */
  client?: string,
  /** A resolved name for client, if any */
  clientName?: string,
  /**
   * The target, may be steamid2 (STEAM_#:#:####), or any arbitary string that an action was performed on
   * If undefined, may be server or console, or unknown
   */
  target?: string,
  /** A resolved name for target, if any */
  targetName?: string,
  message: string,
  /** Any extra metadata, should replace message %variable% with the same property key */
  metadata?: Record<string, string | number | boolean | undefined>,
}

export const TYPE_MAP: Record<string, { icon: string, color?: string, className?: string, label?: string }> = {
  "INFO": {
    icon: "lucide:info",
    color: "var(--ui-info)",
    className: "bg-info"
  },
  "QUIT": {
    icon: "lucide:door-open",
    color: "var(--ui-error)",
    className: "bg-error"
  },
  "JOIN": {
    icon: "lucide:plus",
    color: "var(--ui-success)",
    className: "bg-success"
  },
  "ACTION": {
    icon: "lucide:sparkle",
    color: "var(--ui-warning)",
    className: "bg-warning"
  },
  "STATE": {
    icon: "lucide:activity",
    className: "bg-light-blue text-black dark:text-white"
  },
  "CHAT": {
    icon: "lucide:message-circle",
    className: "bg-neutral-200 text-black"
  },
  "web": {
    icon: "lucide:globe",
    label: "WEB"
  },
  'ADMIN_CHAT': {
    icon: 'lucide:message-circle-more',
    className: 'bg-amber-200 text-black',
    label: 'ADMIN CHAT'
  }
}

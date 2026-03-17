export function formatDate(timestamp?: number, onlyDate = false) {
  const d = timestamp ? new Date(timestamp * 1000) : new Date();
  let output = d.toISOString().split('T')[0]
  if (!onlyDate) output += " at " + d.toLocaleTimeString(undefined, {
    timeStyle: "short"
  });
  return output
}
export function formatSize(bytes: number, si = false, dp = 1) {
  const thresh = si ? 1000 : 1024;

  if (Math.abs(bytes) < thresh) {
    return bytes + ' B';
  }

  const units = si
    ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
  let u = -1;
  const r = 10 ** dp;

  do {
    bytes /= thresh;
    ++u;
  } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);

  return (dp > 0 ? bytes.toFixed(dp) : Math.round(bytes)) + ' ' + units[u];
}
/**
 * Converts unix seconds in the past to a relative date string stating how long ago.
 * @param timestamp timestamp that is before current time
 * @returns number of seconds / minutes / hours / days / weeks ago
 */
export function getRelDate(timestamp: number): string {
  const date = timestamp ? new Date(timestamp * 1000) : new Date();
  const secondsDiff = ((Date.now() - date.getTime()) / 1000);
  const dayDiff = Math.floor(secondsDiff / 86400);
  const monthsDiff = Math.round(dayDiff / 30)
  const yearsDiff = Math.round(monthsDiff / 12)
  if (yearsDiff > 0) return `${yearsDiff} year${yearsDiff == 1 ? "" : "s"} ago`
  if (monthsDiff > 0) return `${monthsDiff} month${monthsDiff == 1 ? "" : "s"} ago`
  if (isNaN(dayDiff) || dayDiff < 0 || dayDiff >= 31) return `in the future`

  return dayDiff == 0 && (
    secondsDiff < 0 && "just now" || secondsDiff < 60 && `${Math.ceil(secondsDiff)} seconds ago` || secondsDiff < 120 && "1 minute ago" || secondsDiff < 3600 && Math.floor(secondsDiff / 60) + " minutes ago" || secondsDiff < 7200 && "1 hour ago" || secondsDiff < 86400 && Math.floor(secondsDiff / 3600) + " hours ago") || dayDiff == 1 && "yesterday" || dayDiff < 7 && dayDiff + " days ago" || dayDiff < 31 && Math.ceil(dayDiff / 7) + " weeks ago"
    || "Unknown"
}

const units: { unit: Intl.RelativeTimeFormatUnit; ms: number }[] = [
  { unit: "year", ms: 31536000000 },
  { unit: "month", ms: 2628000000 },
  { unit: "day", ms: 86400000 },
  { unit: "hour", ms: 3600000 },
  { unit: "minute", ms: 60000 },
  { unit: "second", ms: 1000 },
];

/**
 * Get language-sensitive relative time message from elapsed time.
 * Taken from https://stackoverflow.com/a/66390028
 * @param elapsed   - the elapsed time in milliseconds
 */
export function formatRelTimeDuration(elapsed: number, lang = "en", style = "long"): string {
  const rtf = new Intl.RelativeTimeFormat(lang, { style });
  for (const { unit, ms } of units) {
    if (Math.abs(elapsed) >= ms || unit === "second") {
      return rtf.format(Math.round(elapsed / ms), unit);
    }
  }
  return "";
}

/**
 * Get language-sensitive relative time message from Dates.
 * @param relative  - the relative dateTime, generally is in the past or future. Date or number of seconds (unix timestamp)
 * @param pivot     - the dateTime of reference, generally is the current time
 */
export function formatRelTime(relative: Date | number, pivot: Date = new Date(), lang = "en", style = "long"): string {
  let relDate = relative instanceof Date ? relative : new Date(relative * 1000)

  const elapsed = relDate.getTime() - pivot.getTime();
  return formatRelTimeDuration(elapsed, lang, style);
}

export function convertSnakeToHuman(input: string) {
  return input.replace(/^_*(.)|_+(.)/g, (s, c, d) => c ? c.toUpperCase() : ' ' + d.toUpperCase())
}

export function slugify(input: string) {
  return input
    .toLocaleLowerCase()
    .trim()
    .replace(/\s/g, '-')
    .replace(/[^a-zA-Z_-]/g, '-')
}
